/* ============================================================
   TEST — eenmalige instelsleutels
   ------------------------------------------------------------
   §13 van de opdracht eist expliciet twee eigenschappen die een
   token-stroom gemakkelijk NIET heeft:

     · een verlopen sleutel werkt niet meer
     · een sleutel is EENMALIG

   Plus de eigenschappen die de rotatie zelf betekenis geven: het oude
   wachtwoord moet onmiddellijk ongeldig zijn, lopende sessies moeten
   vallen, en de sleutel mag nergens leesbaar worden bewaard.
   ============================================================ */

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { maakGebruiker, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { maakPool, metOrganisatie, rijen, type Pool } from "../../src/kern/db.ts";
import { controleerWachtwoord, maakWachtwoordHash } from "../../src/dashboard/auth.ts";
import {
  leesInstelsleutel,
  maakInstelsleutel,
  wisselInstelsleutelIn,
} from "../../src/dashboard/instellen.ts";

describe("instelsleutels", () => {
  let db: Wegwerpdatabase;
  let organisatieId: number;
  let gebruikerId: number;
  /* DE OPERATORPOOL. maakInstelsleutel() en wisselInstelsleutelIn()
     schrijven naar wachtwoord_hash, sessie_epoch en
     wachtwoord_tokens — en dat zijn precies de rechten die migratie
     0015 en 0018 aan de APPLICATIEROL onthouden. Deze functies draaien
     in productie dan ook als eigenaar (de CLI en de /instellen-route
     maken daar een eigen pool voor). Een toets die hier db.pool zou
     gebruiken, zou de grendel zelf toetsen in plaats van de functie. */
  let eigenaar: Pool;
  const EMAIL = "sleutel@vibeenergy.nl";

  before(async () => {
    db = await maakWegwerpdatabase("instelsleutel");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
    gebruikerId = await maakGebruiker(db, organisatieId, EMAIL, "beheerder");
    eigenaar = maakPool({ databaseUrl: db.url, rol: null, max: 3 });
  });

  after(async () => {
    await db?.opruimen();
  });

  const gebruiker = () =>
    metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ wachtwoord_hash: string | null; sessie_epoch: number }>(
        c,
        "select wachtwoord_hash, sessie_epoch from intel.gebruikers where id = $1",
        [gebruikerId],
      ),
    ).then((r) => r[0]!);

  test("het uitgeven van een sleutel maakt het OUDE wachtwoord onmiddellijk ongeldig", async () => {
    /* Zonder deze eigenschap is er niets geroteerd: het door een
       ontwikkelaar gekozen wachtwoord zou blijven werken zolang de
       sleutel niet is ingewisseld. */
    const oudeHash = await maakWachtwoordHash("het oude ontwikkelaarswachtwoord");
    await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      c.query("update intel.gebruikers set wachtwoord_hash = $2 where id = $1", [gebruikerId, oudeHash]),
    );
    const voor = await gebruiker();
    assert.ok(voor.wachtwoord_hash, "voorbereiding: er staat een hash");
    assert.equal(await controleerWachtwoord("het oude ontwikkelaarswachtwoord", voor.wachtwoord_hash), true);

    await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );

    const na = await gebruiker();
    assert.equal(na.wachtwoord_hash, null, "de hash hoort gewist te zijn");
    assert.equal(na.sessie_epoch, voor.sessie_epoch + 1, "lopende sessies horen te vallen");
    assert.equal(
      await controleerWachtwoord("het oude ontwikkelaarswachtwoord", na.wachtwoord_hash),
      false,
    );
  });

  test("de sleutel staat NIET leesbaar in de database, alleen zijn sha256", async () => {
    const { sleutel } = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    const rij = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{ token_hash: string }>(
        c,
        "select token_hash from intel.wachtwoord_tokens where gebruiker_id = $1 and gebruikt_op is null",
        [gebruikerId],
      ),
    );
    assert.equal(rij.length, 1);
    assert.notEqual(rij[0]!.token_hash, sleutel, "de sleutel zelf mag er niet staan");
    assert.equal(rij[0]!.token_hash, createHash("sha256").update(sleutel, "utf8").digest("hex"));
    assert.match(rij[0]!.token_hash, /^[0-9a-f]{64}$/);
  });

  test("een nieuwe sleutel laat de VORIGE vervallen", async () => {
    const eerste = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    const tweede = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    const standEerste = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      leesInstelsleutel(c, eerste.sleutel),
    );
    const standTweede = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      leesInstelsleutel(c, tweede.sleutel),
    );
    assert.equal(standEerste.ok, false, "de eerste sleutel hoort vervallen te zijn");
    assert.equal(standTweede.ok, true, "de tweede hoort te werken");
  });

  test("een sleutel is EENMALIG: de tweede inwisseling faalt", async () => {
    const { sleutel } = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    const een = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      wisselInstelsleutelIn(c, sleutel, "een keurig wachtwoord"),
    );
    assert.equal(een.ok, true);

    const twee = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      wisselInstelsleutelIn(c, sleutel, "een ander keurig wachtwoord"),
    );
    assert.equal(twee.ok, false, "dezelfde sleutel mag niet twee keer werken");
    assert.equal(twee.reden, "gebruikt");

    /* En het wachtwoord van de EERSTE inwisseling staat er nog. */
    const g = await gebruiker();
    assert.equal(await controleerWachtwoord("een keurig wachtwoord", g.wachtwoord_hash), true);
    assert.equal(await controleerWachtwoord("een ander keurig wachtwoord", g.wachtwoord_hash), false);
  });

  test("een VERLOPEN sleutel werkt niet meer", async () => {
    const { sleutel } = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL, { geldigMs: 1000 }),
    );
    /* Niet wachten op de klok: de vervaltijd terugzetten is dezelfde
       toestand en maakt de toets deterministisch. */
    await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      c.query(
        `update intel.wachtwoord_tokens
            set verloopt_op = aangemaakt_op + interval '1 millisecond'
          where gebruiker_id = $1 and gebruikt_op is null`,
        [gebruikerId],
      ),
    );
    const stand = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      leesInstelsleutel(c, sleutel),
    );
    assert.equal(stand.ok, false);
    assert.equal(stand.ok === false && stand.reden, "verlopen");

    const uit = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      wisselInstelsleutelIn(c, sleutel, "nog een keurig wachtwoord"),
    );
    assert.equal(uit.ok, false, "een verlopen sleutel mag geen wachtwoord zetten");
  });

  test("een onbekende sleutel geeft dezelfde afwijzing als een verlopen sleutel", async () => {
    /* Geen orakel: de buitenwereld hoort niet te kunnen leren of een
       sleutel ooit heeft bestaan. */
    const stand = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      leesInstelsleutel(c, "x".repeat(43)),
    );
    assert.equal(stand.ok, false);
    assert.equal(stand.ok === false && stand.reden, "onbekend");
  });

  test("een te kort wachtwoord wordt geweigerd en de sleutel blijft bruikbaar", async () => {
    const { sleutel } = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          wisselInstelsleutelIn(c, sleutel, "kort"),
        ),
      /minimaal 12/,
    );
    /* DE SLEUTEL MAG NIET VERBRAND ZIJN door een afgewezen poging:
       anders kost één typefout een nieuwe sleutel. */
    const stand = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      leesInstelsleutel(c, sleutel),
    );
    assert.equal(stand.ok, true, "na een te kort wachtwoord hoort de sleutel nog te werken");
  });

  test("inwisselen trekt lopende sessies in", async () => {
    const { sleutel } = await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      maakInstelsleutel(c, organisatieId, EMAIL),
    );
    const voor = await gebruiker();
    await metOrganisatie(eigenaar, { organisatieId }, (c) =>
      wisselInstelsleutelIn(c, sleutel, "weer een keurig wachtwoord"),
    );
    const na = await gebruiker();
    assert.ok(na.sessie_epoch > voor.sessie_epoch, "de epoch hoort op te schuiven");
  });

  test("de APPLICATIEROL mag geen sleutel uitgeven", async () => {
    /* Uitgeven is een operatorhandeling. Kon het dashboard het zelf,
       dan was een gat in de dashboardcode een weg naar elk account. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.wachtwoord_tokens
               (organisatie_id, gebruiker_id, token_hash, verloopt_op, uitgegeven_door)
             values ($1, $2, $3, now() + interval '1 hour', 'aanvaller')`,
            [organisatieId, gebruikerId, "a".repeat(64)],
          ),
        ),
      (e: unknown) => {
        const m = e instanceof Error ? e.message : String(e);
        assert.match(m, /permission denied|rechten|42501/i, `onverwachte fout: ${m}`);
        return true;
      },
    );
  });
});
