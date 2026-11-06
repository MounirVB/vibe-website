/* ============================================================
   TEST — wie publiceerde dit, en mocht die dat?
   ------------------------------------------------------------
   HET GAT DAT DEZE SUITE VASTZET.

   `intel.publicatiebesluiten` draagt sinds 0004 drie herkomstkolommen,
   maar de publicatiezijde vulde alleen `actor_soort` — en altijd met
   'systeem', ook wanneer een mens de keten met de hand draaide. Een
   handmatige publicatie was in het logboek dus niet te onderscheiden van
   een automatische ronde.

   De reparatie staat in src/inhoud/actor.ts: een actor is een TYPE dat
   alleen die module maakt, een mens wordt tegen de database
   GEVERIFIEERD, en alle regels gaan door één schrijfpad. Migratie 0057
   maakt de belofte structureel.

   WAT HIER WORDT GETOETST, en in welke orde van streng naar mild:

     1-7    ontbrekende, ongeldige en onbevoegde identiteiten
     8      de databasegrendel uit 0057, rechtstreeks
     9-12   wat er werkelijk in de twee auditlagen belandt
     13-14  mens tegenover systeem, en dat ze niet verwisselbaar zijn

   Alles draait op een eigen wegwerpdatabase, zonder netwerk.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  actorVan,
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  RECHT_PUBLICEREN,
  legPublicatiebesluitVast,
  systeemActor,
  verifieerMens,
} from "../../src/inhoud/actor.ts";
import { draaiTerug, keurGoed, publiceer } from "../../src/inhoud/publiceer.ts";

describe("identiteit en bevoegdheid bij publiceren", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let andereOrg = 0;
  let chef = 0;
  let redacteur = 0;
  let lezer = 0;
  let analist = 0;
  let inactief = 0;
  let vreemdeling = 0;
  /* EEN EIGEN SITEWORTEL, en dat is geen netheid maar noodzaak.
     Zonder `siteWortel` neemt publiceer() config.siteWortel, en dat is
     op deze machine de ECHTE werkboom van vibe-website: dan schrijft een
     toets een registerrecord in de repository waarin hij draait. Hier
     staat daarom een tijdelijke map met precies wat de registerweg leest:
     data/inhoud (anders kiest publiceer() de oude HTML-weg) en
     data/seo/routes.json met de route van de onderwerp-eigenaar. */
  let site = "";

  before(async () => {
    db = await maakWegwerpdatabase("identiteit");
    org = await maakOrganisatie(db, "identiteit-org");
    andereOrg = await maakOrganisatie(db, "andere-org");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    redacteur = await maakGebruiker(db, org, "redactie@test.nl", "redacteur");
    lezer = await maakGebruiker(db, org, "lezer@test.nl", "lezer");
    analist = await maakGebruiker(db, org, "analist@test.nl", "analist");
    inactief = await maakGebruiker(db, org, "weg@test.nl", "beheerder");
    vreemdeling = await maakGebruiker(db, andereOrg, "elders@test.nl", "beheerder");
    await alsEigenaar(db, async (c) => {
      await c.query("update intel.gebruikers set actief = false where id = $1", [inactief]);
    });

    site = await mkdtemp(join(tmpdir(), "intel-ident-"));
    await mkdir(join(site, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(site, "data", "seo"), { recursive: true });
    /* HET ROUTEREGISTER IS data/inhoud, NIET routes.json.
       leesRouteregister() leest de JSON-bestanden onder data/inhoud en
       haalt daar de routes uit; routes.json draagt alleen de STATEN
       (INDEX/PENDING) voor leesRouteStaten() en de grendels in pr.ts.
       Zonder dit bestand vindt routeVoorCluster() de onderwerp-eigenaar
       niet en weigert publiceren. */
    await writeFile(
      join(site, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"),
      JSON.stringify({
        route: "kennis/netcongestie-uitgelegd",
        type: "kennis",
        titel: "Netcongestie uitgelegd",
      }),
      "utf8",
    );
    await writeFile(
      join(site, "data", "seo", "routes.json"),
      JSON.stringify({
        routes: [
          {
            route: "kennis/netcongestie-uitgelegd",
            soort: "nationaal",
            subsoort: "kennis",
            staat: "INDEX",
            reden: "fixture",
          },
          { route: "contact", soort: "nationaal", subsoort: "oplossing", staat: "INDEX", reden: "fixture" },
        ],
      }),
      "utf8",
    );
  });

  after(async () => {
    await rm(site, { recursive: true, force: true });
    await db.opruimen();
  });

  const verifieer = (gebruikerId: number, extra: Record<string, unknown> = {}) =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerMens(c, org, { gebruikerId, ...extra }),
    );

  /* ---------------- ontbrekende en ongeldige identiteiten ---------------- */

  test("1 · een onbekend gebruikers-id is geen identiteit", async () => {
    await assert.rejects(() => verifieer(999_999), /bestaat niet|niet actief|ingetrokken/);
  });

  test("2 · nul en negatieve ids worden geweigerd vóór er een query loopt", async () => {
    for (const id of [0, -1, 1.5, Number.NaN]) {
      await assert.rejects(
        () => verifieer(id),
        /geen gebruikers-id/,
        `${String(id)} had geweigerd moeten worden`,
      );
    }
  });

  test("3 · een INACTIEVE gebruiker mag niets publiceren", async () => {
    await assert.rejects(() => verifieer(inactief), /bestaat niet|niet actief|ingetrokken/);
  });

  test("4 · een gebruiker uit een ANDERE organisatie wordt geweigerd", async () => {
    /* GEMETEN NUANCE, en strenger dan verwacht: de RLS-policy
       `gebruikers_eigen_organisatie` (0001) verbergt de vreemdeling al
       vóór verifieerMens() naar zijn organisatie kan kijken, dus de
       foutregel is die van 'bestaat niet'. De expliciete
       organisatietoets in verifieerMens() blijft als tweede slot staan
       voor een aanroeper die buiten RLS leest (de eigenaar). */
    await assert.rejects(
      () => verifieer(vreemdeling),
      /bestaat niet|niet actief|ingetrokken/,
      "RLS hoort hem al onzichtbaar te maken",
    );
  });

  test("5 · een INGETROKKEN sessie telt niet, ook met het juiste id", async () => {
    /* De epoch uit het koekje wordt tegen de database gehouden; schuift
       hij op, dan is het koekje ongeldig. Dit is de grendel die een
       gestolen of oud koekje waardeloos maakt. */
    await assert.rejects(
      () => verifieer(chef, { sessieEpoch: 99 }),
      /bestaat niet|niet actief|ingetrokken/,
    );
    /* En met de JUISTE epoch mag het wel — zonder deze tegenproef zou de
       toets ook groen zijn als de functie altijd weigert. De standaard is
       1 en niet 0; migratie 0015 regel 41 zet
       `sessie_epoch integer not null default 1`. */
    const a = await verifieer(chef, { sessieEpoch: 1 });
    assert.equal(a.soort, "mens");
  });

  test("6 · ONBEVOEGD: zonder het recht inhoud.publiceren gaat er niets door", async () => {
    for (const [naam, id] of [
      ["lezer", lezer],
      ["analist", analist],
    ] as const) {
      await assert.rejects(
        () => verifieer(id),
        new RegExp(RECHT_PUBLICEREN.replace(/\./g, "\\.")),
        `de rol ${naam} heeft het publicatierecht niet`,
      );
    }
  });

  test("7 · bevoegd: beheerder en redacteur dragen het publicatierecht", async () => {
    for (const id of [chef, redacteur]) {
      const a = await verifieer(id);
      assert.equal(a.soort, "mens");
      assert.ok(a.soort === "mens" && a.email.includes("@"), "de actor hoort zijn adres te dragen");
      assert.ok(a.soort === "mens" && a.rol !== null, "en zijn rol, want door_rol bestond en bleef leeg");
    }
  });

  test("7b · een systeemactor zonder grond is geen herkomst", () => {
    assert.throws(() => systeemActor(""), /grond/);
    assert.throws(() => systeemActor("  "), /grond/);
    const a = systeemActor("automatische ronde");
    assert.equal(a.soort, "systeem");
  });

  /* ---------------- de databasegrendel uit 0057 ---------------- */

  test("8 · de database weigert 'mens' zonder gebruikers-id", async () => {
    const v = await maakDragendeVersie(db, org, { slug: "identiteit-grendel" });
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.publicatiebesluiten
               (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
             values ($1, $2, 'gepubliceerd', 'mens', 'zonder naam')`,
            [org, v.versieId],
          );
        }),
      /publicatiebesluiten_mens_heeft_account/,
      "een handmatige handeling zonder identiteit hoort de database niet in te komen",
    );

    /* 'systeem' zonder id mag WEL: dat is geen mens. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.publicatiebesluiten
           (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
         values ($1, $2, 'automatisch_geblokkeerd', 'systeem', 'een ronde zonder mens')`,
        [org, v.versieId],
      );
    });
  });

  /* ---------------- wat er werkelijk wordt vastgelegd ---------------- */

  async function regels(versieId: number) {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const b = await c.query<{
        besluit: string;
        actor_soort: string;
        door_gebruiker_id: number | null;
        door_rol: string | null;
        motivatie: string;
        poortresultaten: { fase?: string };
      }>(
        `select besluit, actor_soort, door_gebruiker_id, door_rol, motivatie, poortresultaten
           from intel.publicatiebesluiten where inhoud_versie_id = $1 order by id`,
        [versieId],
      );
      const a = await c.query<{
        actor_soort: string;
        actor_id: number | null;
        actor_naam: string;
        handeling: string;
      }>(
        `select actor_soort, actor_id, actor_naam, handeling
           from intel.audit_gebeurtenissen
          where objectsoort = 'inhoud_versie' and object_id = $1 order by id`,
        [String(versieId)],
      );
      return { besluiten: b.rows, audit: a.rows };
    });
  }

  test("9 · een goedkeuring draagt de naam EN de rol van de goedkeurder", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "identiteit-goedkeuren",
      publiceerbaar: true,
      aangemaaktDoor: redacteur,
    });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "gelezen en akkoord"),
    );
    assert.ok(uit.goedgekeurd, "de fixture hoort goedgekeurd te raken");

    const r = await regels(v.versieId);
    const g = r.besluiten.find((x) => x.besluit === "goedgekeurd");
    assert.ok(g, "er hoort een goedkeuringsbesluit te staan");
    assert.equal(g.actor_soort, "mens");
    assert.equal(g.door_gebruiker_id, chef);
    assert.equal(g.door_rol, "beheerder", "door_rol bleef vroeger altijd leeg");
    assert.equal(g.poortresultaten.fase, "GOEDGEKEURD");
    /* DE MOTIVATIE BLIJFT DIE VAN DE AANROEPER. De naam zit in de
       kolommen `door_gebruiker_id` en `door_rol`; hem ook in de tekst
       plakken zou dezelfde waarheid twee keer opschrijven. */
    assert.equal(g.motivatie, "gelezen en akkoord");
  });

  test("10 · publiceren legt de MENS vast, in beide auditlagen", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "identiteit-publiceren",
      publiceerbaar: true,
      aangemaaktDoor: redacteur,
    });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "akkoord"),
    );
    const actor = await actorVan(db, org, chef);
    const rapport = await publiceer(db.pool, org, v.versieId, { actor, siteWortel: site });
    assert.ok(rapport.geschreven, `publiceren hoort te lukken: ${rapport.reden}`);

    const r = await regels(v.versieId);
    const p = r.besluiten.filter((x) => x.poortresultaten.fase === "RECORD_GESCHREVEN");
    assert.equal(p.length, 1, "precies één regel voor het geschreven record");
    assert.equal(p[0]!.actor_soort, "mens", "GEEN 'systeem' meer voor een handmatige publicatie");
    assert.equal(p[0]!.door_gebruiker_id, chef);
    assert.equal(p[0]!.door_rol, "beheerder");

    const audit = r.audit.find((x) => x.handeling === "publicatierecord_geschreven");
    assert.ok(audit, "het algemene auditspoor hoort de publicatie ook te kennen");
    assert.equal(audit.actor_soort, "mens");
    assert.equal(audit.actor_id, chef);
    assert.equal(audit.actor_naam, "chef@test.nl");
  });

  test("11 · terugdraaien legt de MENS vast, niet het systeem", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "identiteit-terugdraaien",
      publiceerbaar: true,
      aangemaaktDoor: redacteur,
    });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "akkoord"),
    );
    const actor = await actorVan(db, org, chef);
    const rapport = await publiceer(db.pool, org, v.versieId, { actor, siteWortel: site });
    assert.ok(rapport.publicatieId !== null);

    /* Terugdraaien door een ANDER mens dan de publiceerder: ook dat hoort
       herleidbaar te zijn, en het is de realistische situatie. */
    const andere = await actorVan(db, org, redacteur);
    const terug = await draaiTerug(db.pool, org, rapport.publicatieId!, { actor: andere, siteWortel: site });
    assert.match(terug.reden, /verwijderd|hersteld|generator/);

    const r = await regels(v.versieId);
    const t = r.besluiten.filter((x) => x.poortresultaten.fase === "TERUGGEDRAAID");
    assert.equal(t.length, 1);
    assert.equal(t[0]!.actor_soort, "mens");
    assert.equal(t[0]!.door_gebruiker_id, redacteur, "wie terugdraaide, niet wie publiceerde");
    const audit = r.audit.find((x) => x.handeling === "publicatie_teruggedraaid");
    assert.ok(audit);
    assert.equal(audit.actor_id, redacteur);
  });

  test("12 · een SYSTEEMronde blijft 'systeem', zonder id maar MET grond", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "identiteit-systeem",
      publiceerbaar: true,
      aangemaaktDoor: redacteur,
    });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "akkoord"),
    );
    const rapport = await publiceer(db.pool, org, v.versieId, {
      actor: systeemActor("automatische publicatieronde onder beleid v1-propose-only"),
      siteWortel: site,
    });
    assert.ok(rapport.geschreven, rapport.reden);

    const r = await regels(v.versieId);
    const p = r.besluiten.find((x) => x.poortresultaten.fase === "RECORD_GESCHREVEN");
    assert.ok(p);
    assert.equal(p.actor_soort, "systeem");
    assert.equal(p.door_gebruiker_id, null, "het systeem heeft met opzet geen gebruikersrij");
    assert.match(p.motivatie, /\[automatische publicatieronde onder beleid v1-propose-only\]/);
  });

  test("13 · een mens en het systeem zijn in het logboek niet te verwisselen", async () => {
    /* De kern van de correctie: de aanroeper geeft geen string mee maar
       een actor, en de drie herkomstkolommen worden DAARUIT afgeleid.
       Deze toets gebruikt het schrijfpad rechtstreeks, zodat hij ook
       breekt als iemand later een eigen insert toevoegt. */
    const v = await maakDragendeVersie(db, org, { slug: "identiteit-verschil" });
    const mens = await actorVan(db, org, chef);
    await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: v.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor: mens,
        motivatie: "met de hand",
      });
      await legPublicatiebesluitVast(c, {
        organisatieId: org,
        inhoudVersieId: v.versieId,
        besluit: "ingediend",
        fase: "PR_AANGEMAAKT",
        actor: systeemActor("geplande taak"),
        motivatie: "door een taak",
      });
    });
    const r = await regels(v.versieId);
    const mensRegel = r.besluiten.find((x) => x.actor_soort === "mens");
    const systeemRegel = r.besluiten.find((x) => x.actor_soort === "systeem");
    assert.ok(mensRegel && systeemRegel, "beide soorten horen te bestaan");
    assert.equal(mensRegel.door_gebruiker_id, chef);
    assert.equal(systeemRegel.door_gebruiker_id, null);
    assert.notEqual(mensRegel.motivatie, systeemRegel.motivatie);
  });

  test("14 · elke publicatiezijdige regel in deze suite heeft een herleidbare herkomst", async () => {
    /* Een vangnet over alles wat de suite hierboven heeft geschreven: er
       mag geen enkele 'mens'-regel zonder id bestaan, en geen enkele
       regel zonder fase. Zo'n totaaltoets vangt een nieuw schrijfpad dat
       de helper omzeilt. */
    const alles = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.publicatiebesluiten
          where actor_soort = 'mens' and door_gebruiker_id is null`,
      );
      const zonderFase = await c.query<{ n: string }>(
        `select count(*)::text as n from intel.publicatiebesluiten
          where poortresultaten->>'fase' is null`,
      );
      return { zonderNaam: Number(r.rows[0]!.n), zonderFase: Number(zonderFase.rows[0]!.n) };
    });
    assert.equal(alles.zonderNaam, 0, "een mens zonder naam hoort niet te kunnen bestaan");
    /* De twee rijen die zaak 8 met de hand invoerde hebben met opzet geen
       fase; al het andere komt uit het schrijfpad en heeft er wel een. */
    assert.ok(alles.zonderFase <= 1, `onverwacht veel regels zonder fase: ${alles.zonderFase}`);
  });
});
