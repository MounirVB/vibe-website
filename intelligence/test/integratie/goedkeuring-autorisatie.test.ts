/* ============================================================
   TEST — wie mag een inhoudsversie goedkeuren, en wie niet
   ------------------------------------------------------------
   WAT HIER WORDT BEWEZEN, EN WAAROM HET ONTBRAK.

   Er zijn in dit platform TWEE goedkeurlanen, en ze hadden een
   ongelijk beveiligingsniveau:

     intel.inhoud_voorstellen  -> beoordeel()  in inhoud/beoordeling.ts
         recht uit intel.rol_rechten, hashbinding, gemeten
         websiteversie, append-only logboek. PUBLICEERT NIETS.

     intel.inhoud_versies      -> keurGoed()   in inhoud/publiceer.ts
         de laan die WEL tot een bestand op schijf en een pull request
         leidt. Gemeten op b2de0c4:
           grep -cE 'rol_rechten|RECHT_' src/inhoud/publiceer.ts  -> 0
           grep -cE 'rol_rechten|RECHT_' src/cli/publiceer.ts     -> 0
           grep -cE 'rol_rechten|RECHT_' src/publicatie/pr.ts     -> 0

   `npm run publiceer -- --versie N --goedkeuren <willekeurig id>` was
   daarmee een volledige, onbevoegde publicatieketen.

   En de vier-ogenregel werkte LEEG. De constraint luidt
   `goedgekeurd_door is null or (goedgekeurd_door is distinct from
   aangemaakt_door and goedgekeurd_door is distinct from bewerkt_door)`.
   Beide kolommen bestaan sinds 0004 en 0009, maar werden in heel src/
   nergens geschreven — gemeten: 7 rijen, 0 met aangemaakt_door, 0 met
   bewerkt_door. En `x is distinct from null` is TRUE voor elke x, dus
   de constraint slaagde altijd zonder iets te toetsen.

   §9 van de opdracht eist vier dingen van een goedkeuring: een
   BEVOEGDE gebruiker, een EXPLICIETE handeling, een IDENTITEIT en een
   AUDITSPOOR. Deze suite toetst alle vier, in de laan die publiceert.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import {
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { keurGoed } from "../../src/inhoud/publiceer.ts";

describe("goedkeuren vraagt een bevoegde, herleidbare mens", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let lezer = 0;
  let geschorst = 0;

  /* DE FIXTURE IS VERZWAARD, EN DAT MOEST.
     Hier stond één insert in intel.inhoud_versies met een verzonnen
     `inhoud_afdruk` ('afdruk-/nieuws/...') en zonder één gebonden
     claim. Dat werkte omdat keurGoed() destijds geen enkel
     uitspraakveld las en de afdruk niet narekende. Sinds de
     acceptatiecorrectie doet hij beide, en dan is zo'n rij geen
     representatieve testopstelling meer maar een onmogelijke toestand:
     een concept dat nergens op rust.
     `maakDragendeVersie()` in het harnas bouwt de hele keten -- bron,
     document, geclassificeerde versie, claim met modaliteit en
     plafond, primaire binding, invoer_versies -- zodat deze toetsen
     precies dát blijven toetsen waarvoor ze bestaan: WIE mag
     goedkeuren. */
  let teller = 0;
  async function nieuweVersie(
    opties: {
      aangemaaktDoor?: number | null;
      bewerktDoor?: number | null;
      risico?: "laag" | "midden" | "hoog";
      slug?: string;
    } = {},
  ): Promise<number> {
    teller += 1;
    const r = await maakDragendeVersie(db, org, {
      slug: opties.slug ?? `versie-${teller}`,
      ...(opties.risico === undefined ? {} : { risico: opties.risico }),
      ...(opties.aangemaaktDoor === undefined ? {} : { aangemaaktDoor: opties.aangemaaktDoor }),
      ...(opties.bewerktDoor === undefined ? {} : { bewerktDoor: opties.bewerktDoor }),
    });
    return r.versieId;
  }

  before(async () => {
    db = await maakWegwerpdatabase("goedkeuring");
    org = await maakOrganisatie(db, "goedkeur-org");
    /* De rollenmatrix uit 0001, gemeten:
         inhoud.goedkeuren             -> beheerder, redacteur
         inhoud.hoogrisico.goedkeuren  -> beheerder
         (lezer heeft alleen inhoud.lezen) */
    auteur = await maakGebruiker(db, org, "auteur@test.nl", "redacteur");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    lezer = await maakGebruiker(db, org, "lezer@test.nl", "lezer");
    geschorst = await maakGebruiker(db, org, "weg@test.nl", "redacteur");
    await alsEigenaar(db, async (c) => {
      await c.query("update intel.gebruikers set actief = false where id = $1", [geschorst]);
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /* ---------------- bevoegde gebruiker ---------------- */

  test("zonder het recht inhoud.goedkeuren is goedkeuren onmogelijk", async () => {
    const versie = await nieuweVersie({ slug: "zonder-recht" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, lezer, "ik vind het mooi"),
        ),
      (e: Error) => {
        assert.match(e.message, /inhoud\.goedkeuren/);
        return true;
      },
    );
  });

  test("een gebruiker die niet bestaat kan niets vrijgeven", async () => {
    const versie = await nieuweVersie({ slug: "onbekende-gebruiker" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, 999_999, "spookgebruiker"),
        ),
      (e: Error) => {
        assert.match(e.message, /bestaat niet/);
        return true;
      },
    );
  });

  test("een geschorste rekening kan niets vrijgeven", async () => {
    const versie = await nieuweVersie({ slug: "geschorst" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, geschorst, "toch maar even"),
        ),
      (e: Error) => {
        assert.match(e.message, /niet actief/);
        return true;
      },
    );
  });

  test("risicoklasse hoog vraagt een eigen recht dat een redacteur niet heeft", async () => {
    /* De architectuur legt vast dat juridische, subsidie-, rendements-,
       veiligheids- en netcapaciteitsuitspraken 'hoog' zijn en altijd een
       mens met een zwaarder mandaat vragen. */
    const versie = await nieuweVersie({ risico: "hoog", slug: "hoog-risico" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, auteur, "hoog risico door een redacteur"),
        ),
      (e: Error) => {
        assert.match(e.message, /hoogrisico/);
        return true;
      },
    );
  });

  test("een beheerder mag hoog risico wel", async () => {
    const versie = await nieuweVersie({ risico: "hoog", slug: "hoog-risico-chef" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "beoordeeld door de chef"),
    );
    const r = await alsEigenaar(db, (c) =>
      c.query<{ status: string }>("select status from intel.inhoud_versies where id = $1", [versie]),
    );
    assert.equal(r.rows[0]!.status, "goedgekeurd");
  });

  /* ---------------- vier ogen ---------------- */

  test("wie de versie zelf heeft aangemaakt mag hem niet goedkeuren", async () => {
    /* DIT IS DE TOETS DIE DE LEGE CONSTRAINT VERVANGT. De database kan
       dit alleen zien als aangemaakt_door gevuld IS; deze toets vult hem
       en bewijst dat de grendel dan dichtgaat. */
    const versie = await nieuweVersie({ aangemaaktDoor: chef, slug: "zelf-gemaakt" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, chef, "mijn eigen tekst"),
        ),
      (e: Error) => {
        assert.match(e.message, /zelf aangemaakt/);
        return true;
      },
    );
  });

  test("wie de versie als laatste heeft bewerkt mag hem niet goedkeuren", async () => {
    /* Dit is het geval dat écht gaat optreden zodra het dashboard
       'artikel aanpassen' kan: een redacteur past de tekst aan en keurt
       hem vervolgens zelf goed. */
    const versie = await nieuweVersie({ bewerktDoor: chef, slug: "zelf-bewerkt" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, versie, chef, "ik heb het net nog bijgeschaafd"),
        ),
      (e: Error) => {
        assert.match(e.message, /als laatste bewerkt/);
        return true;
      },
    );
  });

  test("een tweede mens met het recht mag de tekst van een ander wel goedkeuren", async () => {
    const versie = await nieuweVersie({ aangemaaktDoor: auteur, slug: "vier-ogen-ok" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "gelezen en akkoord"),
    );
    const r = await alsEigenaar(db, (c) =>
      c.query<{ status: string; goedgekeurd_door: number }>(
        "select status, goedgekeurd_door from intel.inhoud_versies where id = $1",
        [versie],
      ),
    );
    assert.equal(r.rows[0]!.status, "goedgekeurd");
    assert.equal(r.rows[0]!.goedgekeurd_door, chef);
  });

  /* ---------------- identiteit, afdruk en auditspoor ---------------- */

  test("de goedkeuring bindt aan de afdruk van de inhoud", async () => {
    const versie = await nieuweVersie({ slug: "afdrukbinding" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "akkoord"),
    );
    const r = await alsEigenaar(db, (c) =>
      c.query<{ inhoud_afdruk: string; goedgekeurde_afdruk: string }>(
        "select inhoud_afdruk, goedgekeurde_afdruk from intel.inhoud_versies where id = $1",
        [versie],
      ),
    );
    assert.equal(r.rows[0]!.goedgekeurde_afdruk, r.rows[0]!.inhoud_afdruk);
  });

  test("de tekst wijzigen NA goedkeuring maakt de versie onpubliceerbaar", async () => {
    /* De constraint inhoud_versies_goedkeuring_bindt hoort dit te
       weigeren; dat is de reden dat de afdruk wordt vastgelegd. */
    const versie = await nieuweVersie({ slug: "na-goedkeuring-wijzigen" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "akkoord"),
    );
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query(
            "update intel.inhoud_versies set body_markdown = $2, inhoud_afdruk = $3 where id = $1",
            [versie, "Heel andere tekst.", "een-andere-afdruk"],
          ),
        ),
      "een gewijzigde afdruk na goedkeuring hoort geweigerd te worden",
    );
  });

  test("elke goedkeuring laat een append-only spoor achter met wie en wanneer", async () => {
    const versie = await nieuweVersie({ slug: "auditspoor" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "dit is de motivatie"),
    );
    const r = await alsEigenaar(db, (c) =>
      c.query<{
        besluit: string;
        door_gebruiker_id: number;
        actor_soort: string;
        motivatie: string;
      }>(
        `select besluit, door_gebruiker_id, actor_soort, motivatie
           from intel.publicatiebesluiten
          where inhoud_versie_id = $1 and besluit = 'goedgekeurd'`,
        [versie],
      ),
    );
    assert.equal(r.rows.length, 1, "er hoort precies één goedkeuringsbesluit te staan");
    assert.equal(r.rows[0]!.door_gebruiker_id, chef);
    assert.equal(r.rows[0]!.actor_soort, "mens");
    assert.equal(r.rows[0]!.motivatie, "dit is de motivatie");
  });

  test("het besluitenlogboek is niet te wijzigen en niet te wissen", async () => {
    const versie = await nieuweVersie({ slug: "append-only" });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versie, chef, "akkoord"),
    );
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query("update intel.publicatiebesluiten set motivatie = 'herschreven' where inhoud_versie_id = $1", [
            versie,
          ]),
        ),
      "een publicatiebesluit hoort onveranderbaar te zijn",
    );
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query("delete from intel.publicatiebesluiten where inhoud_versie_id = $1", [versie]),
        ),
      "een publicatiebesluit hoort niet te wissen te zijn",
    );
  });

  /* ---------------- geen zelfstandige machine ---------------- */

  test("de applicatierol kan een versie niet zelf op goedgekeurd zetten", async () => {
    /* §9: geen enkele agent, scheduler, worker, route of
       databasefunctie mag zelfstandig goedkeuren. De applicatierol is
       de rol waaronder al die code draait. Een directe UPDATE met
       goedgekeurd_door = null hoort door de database geweigerd te
       worden, want dan is er geen herleidbare mens. */
    const versie = await nieuweVersie({ slug: "machine-keurt-goed" });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          c.query(
            "update intel.inhoud_versies set status = 'goedgekeurd' where id = $1",
            [versie],
          ),
        ),
      "goedgekeurd zonder goedkeurder hoort geweigerd te worden",
    );
  });
});
