/* ============================================================
   TEST — sessie-intrekking tegen een echte database
   ------------------------------------------------------------
   De sessie is een staatloos HMAC-koekje. Tot migratie 0015 zat er
   niets in de lading dat naar het wachtwoord verwees, en dus bestond er
   GEEN manier om een sessie in te trekken: wie een geldig koekje had,
   hield acht uur toegang, ook nadat het wachtwoord was gerouleerd.

   Deze suite toetst de eigenschap die daarvoor in de plaats komt, en
   wel tegen een echte database — want de intrekking leeft in een kolom
   en niet in het geheugen van een proces.

   DRIE DINGEN WORDEN APART GETOETST
     1 een koekje van vóór de rotatie werkt niet meer
     2 een koekje van ná de rotatie werkt wel
     3 het rechtenmodel laat de APPLICATIEROL de epoch niet opschuiven
       — anders zou het dashboard zijn eigen intrekking kunnen omzeilen
   ============================================================ */

import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { after, before, describe, test } from "node:test";
import pg from "pg";
import { maakGebruiker, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { leesGebruiker, leesSessieCookie, maakSessieCookie } from "../../src/dashboard/auth.ts";

describe("sessie-intrekking", () => {
  let db: Wegwerpdatabase;
  let organisatieId: number;
  let gebruikerId: number;

  before(async () => {
    process.env["INTEL_SESSIE_GEHEIM"] = "t".repeat(40);
    db = await maakWegwerpdatabase("sessieintrekking");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
    gebruikerId = await maakGebruiker(db, organisatieId, "intrekking@vibeenergy.nl", "beheerder");
  });

  after(async () => {
    await db?.opruimen();
  });

  async function epochUitDb(): Promise<number> {
    const c = new pg.Client({ connectionString: db.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      const r = await c.query<{ sessie_epoch: number }>(
        "select sessie_epoch from intel.gebruikers where id = $1",
        [gebruikerId],
      );
      return r.rows[0]!.sessie_epoch;
    } finally {
      await c.end();
    }
  }

  async function schuifEpochOp(): Promise<void> {
    const c = new pg.Client({ connectionString: db.url, options: "-c search_path=intel,public" });
    await c.connect();
    try {
      await c.query("update intel.gebruikers set sessie_epoch = sessie_epoch + 1 where id = $1", [
        gebruikerId,
      ]);
    } finally {
      await c.end();
    }
  }

  test("een nieuwe gebruiker begint op epoch 1 en zijn koekje wordt geaccepteerd", async () => {
    const epoch = await epochUitDb();
    assert.equal(epoch, 1, "de default uit migratie 0015");

    const cookie = maakSessieCookie(gebruikerId, organisatieId, epoch);
    const sessie = leesSessieCookie(cookie);
    assert.ok(sessie, "het koekje hoort leesbaar te zijn");
    assert.equal(sessie.sessieEpoch, 1);

    const g = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      leesGebruiker(c, gebruikerId, sessie.sessieEpoch),
    );
    assert.ok(g, "met de juiste epoch hoort de gebruiker gelezen te worden");
    assert.equal(g.email, "intrekking@vibeenergy.nl");
  });

  test("na een rotatie werkt het OUDE koekje niet meer", async () => {
    const oudeEpoch = await epochUitDb();
    const oudCookie = maakSessieCookie(gebruikerId, organisatieId, oudeEpoch);
    const oudeSessie = leesSessieCookie(oudCookie);
    assert.ok(oudeSessie);

    await schuifEpochOp();

    /* Het koekje is nog steeds correct ONDERTEKEND en nog niet verlopen;
       leesSessieCookie accepteert hem dus. De intrekking hoort te
       gebeuren op het moment dat de gebruiker uit de database komt. */
    assert.ok(leesSessieCookie(oudCookie), "de ondertekening blijft geldig");

    const g = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      leesGebruiker(c, gebruikerId, oudeSessie.sessieEpoch),
    );
    assert.equal(g, null, "een koekje van voor de rotatie moet geweigerd worden");
  });

  test("na een rotatie werkt een NIEUW koekje wel", async () => {
    const nieuweEpoch = await epochUitDb();
    const sessie = leesSessieCookie(maakSessieCookie(gebruikerId, organisatieId, nieuweEpoch));
    assert.ok(sessie);
    const g = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      leesGebruiker(c, gebruikerId, sessie.sessieEpoch),
    );
    assert.ok(g, "met de nieuwe epoch hoort toegang te werken");
  });

  test("een koekje ZONDER epoch wordt geweigerd, ook met een geldige ondertekening", () => {
    /* Een koekje van vóór 0015. Behandelen als 'epoch 1' zou precies de
       sessies doorlaten die de intrekking moet verbreken. */
    const lading = Buffer.from(
      JSON.stringify({ g: gebruikerId, o: organisatieId, v: Date.now() + 60_000 }),
      "utf8",
    ).toString("base64url");
    const sig = createHmac("sha256", Buffer.from("t".repeat(40), "utf8"))
      .update(lading)
      .digest("base64url");
    assert.equal(leesSessieCookie(`${lading}.${sig}`), null);
  });

  test("de APPLICATIEROL mag de sessie-epoch niet opschuiven", async () => {
    /* Zou het dashboard dit wel mogen, dan kon een gat in de
       dashboardcode zijn eigen intrekking ongedaan maken. Migratie 0015
       trekt het tabelbrede update-recht in en geeft alleen
       `laatste_login` terug. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          c.query("update intel.gebruikers set sessie_epoch = 999 where id = $1", [gebruikerId]),
        ),
      (e: unknown) => {
        const m = e instanceof Error ? e.message : String(e);
        assert.match(m, /permission denied|rechten|42501/i, `onverwachte fout: ${m}`);
        return true;
      },
    );
  });

  test("de applicatierol mag laatste_login WEL bijwerken", async () => {
    /* De keerzijde van de vorige toets: het inlogpad heeft deze ene
       kolom nodig. Zou die grant te breed zijn ingetrokken, dan faalt
       elke geslaagde inlog. */
    await metOrganisatie(db.pool, { organisatieId }, (c) =>
      c.query("update intel.gebruikers set laatste_login = now() where id = $1", [gebruikerId]),
    );
  });

  test("de UPSERT van zaai werkt onder de applicatierol", async () => {
    /* DEZE TOETS BESTAAT OMDAT HIJ ONTBRAK EN DAT PRODUCTIE HEEFT GEKOST.
       Migratie 0015 nam het tabelbrede update-recht op intel.gebruikers
       af en gaf alleen `laatste_login` terug. Dat liet elke bestaande
       toets groen — maar `src/db/zaai.ts` doet een upsert met
       `on conflict ... do update set naam`, en die heeft UPDATE op de
       kolom `naam` nodig. De api-deploy draait zaai als pre-deploy, dus
       de deploy faalde met 'permission denied for table gebruikers'.
       Migratie 0017 geeft dat ene kolomrecht terug.

       De vorm hieronder is bewust LETTERLIJK die uit zaai.ts. Een toets
       die alleen 'update naam' probeert zou de conflictclausule missen,
       en juist daar zat het. */
    await metOrganisatie(db.pool, { organisatieId }, (c) =>
      c.query(
        `insert into intel.gebruikers (organisatie_id, email, naam, wachtwoord_hash)
         values ($1, $2, $3, null)
         on conflict (lower(email)) do update set naam = excluded.naam
         returning id`,
        [organisatieId, "intrekking@vibeenergy.nl", "Nieuwe Naam"],
      ),
    );
    const c2 = new pg.Client({ connectionString: db.url, options: "-c search_path=intel,public" });
    await c2.connect();
    try {
      const r = await c2.query<{ naam: string }>(
        "select naam from intel.gebruikers where id = $1",
        [gebruikerId],
      );
      assert.equal(r.rows[0]?.naam, "Nieuwe Naam", "de upsert hoort de naam te hebben bijgewerkt");
    } finally {
      await c2.end();
    }
  });

  test("de applicatierol mag ONDANKS 0017 nog steeds niet aan wachtwoord_hash", async () => {
    /* De grendel uit 0015 moet overeind blijven na de reparatie van
       0017. Eén kolom erbij mag niet betekenen dat de deur open staat. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          c.query("update intel.gebruikers set wachtwoord_hash = 'x' where id = $1", [gebruikerId]),
        ),
      (e: unknown) => {
        const m = e instanceof Error ? e.message : String(e);
        assert.match(m, /permission denied|rechten|42501/i, `onverwachte fout: ${m}`);
        return true;
      },
    );
  });
});
