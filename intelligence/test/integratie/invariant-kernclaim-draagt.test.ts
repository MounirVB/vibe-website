/* ============================================================
   INTEGRATIE — de database-invariant eist hetzelfde als de poort
   ------------------------------------------------------------
   WAAROM DIT BESTAAT. Migratie 0044 voegt de bevinding
   `kernclaim_draagt_niet` toe aan
   `intel_priv.controleer_inhoudsinvarianten()`. De drempel 0.50 en de
   lijst niet-dragende documentsoorten staan daar LETTERLIJK in SQL,
   want SQL kan `claimDraagt()` niet aanroepen.

   Dat is een bewuste keuze met een prijs: twee formuleringen van
   dezelfde regel kunnen uiteenlopen. Dit platform heeft die fout al
   vaker gemeten — een met de hand bijgehouden omgekeerde gezagkaart die
   een bron miste, een dashboardregel die claimDraagt() nabouwde zonder
   de documentsoort. De toetsen hieronder maken het uiteenlopen ROOD in
   plaats van stil:

     1 de drempel in SQL is gelijk aan NOODZAKELIJKE_ZEKERHEID;
     2 de soortenlijst in SQL is gelijk aan NIET_DRAGENDE_DOCUMENTSOORTEN;
     3 en de invariant vindt werkelijk wat hij belooft te vinden.

   Toets 3 is de belangrijkste. Toets 1 en 2 vergelijken tekst; alleen
   toets 3 bewijst dat de functie een echte rij afkeurt.
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
import { metOrganisatie, zonderOrganisatie } from "../../src/kern/db.ts";
import { NOODZAKELIJKE_ZEKERHEID } from "../../src/pijplijn/claimmodaliteit.ts";
import { NIET_DRAGENDE_DOCUMENTSOORTEN } from "../../src/pijplijn/documentsoort.ts";

describe("de invariant kernclaim_draagt_niet", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let chef = 0;

  before(async () => {
    db = await maakWegwerpdatabase("invariant-draagt");
    org = await maakOrganisatie(db, "invariant-org");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
  });

  /* PUBLICEREN VRAAGT MEER DAN EEN STATUS, en dat is precies goed.
     Twee constraints uit 0009 staan ervoor: `goedkeuring_bindt` eist dat
     `goedgekeurde_afdruk` gelijk is aan `inhoud_afdruk`, en een tweede
     eist een menselijke goedkeurder. Een fixture die alleen de status
     zet, botst daarop -- en dat is geen hinder maar het bewijs dat de
     publicatiestand niet los van de goedkeuring kan bestaan. */
  async function publiceerRij(versieId: number): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status = 'gepubliceerd',
                goedgekeurd_door = $2,
                goedgekeurd_op = now(),
                goedgekeurde_afdruk = inhoud_afdruk
          where id = $1`,
        [versieId, chef],
      );
    });
  }

  after(async () => {
    await db.opruimen();
  });

  /** De brontekst van de invariantfunctie, zoals de database hem kent. */
  async function functiebron(): Promise<string> {
    return zonderOrganisatie(db.pool, async (c) => {
      const r = await c.query<{ src: string }>(
        "select prosrc as src from pg_proc where proname = 'controleer_inhoudsinvarianten'",
      );
      assert.equal(r.rows.length, 1, "de invariantfunctie hoort te bestaan");
      return r.rows[0]!.src;
    });
  }

  /** Alle bevindingen van de inhoudsinvarianten.
   *
   * MET ORGANISATIECONTEXT, en dat is geen detail. De functie is
   * `security invoker` en leest tabellen met RLS. Zonder
   * `app.organisatie_id` geeft `intel_priv.huidige_organisatie()` niets
   * terug en ziet de applicatierol NUL rijen — dan meldt de invariant
   * vrolijk dat alles klopt terwijl hij niets heeft kunnen zien. Dat
   * overkwam deze toets eerst: vier zaken faalden met een lege lijst.
   * De schema-invarianten in `harnas.invarianten()` hebben dit niet
   * nodig, want die lezen catalogustabellen zonder RLS. */
  async function bevindingen(): Promise<{ soort: string; bevinding: string }[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ soort: string; bevinding: string }>(
        "select soort, bevinding from intel_priv.controleer_inhoudsinvarianten()",
      );
      return r.rows;
    });
  }

  test("1 · de zekerheidsdrempel in SQL is dezelfde als in de code", async () => {
    const src = await functiebron();
    const verwacht = NOODZAKELIJKE_ZEKERHEID.toFixed(2);
    assert.ok(
      src.includes(verwacht),
      `migratie 0044 hoort de drempel ${verwacht} te gebruiken (NOODZAKELIJKE_ZEKERHEID). ` +
        "Is die constante gewijzigd, dan hoort er een migratie bij die de invariant meeneemt.",
    );
  });

  test("2 · de niet-dragende documentsoorten in SQL zijn dezelfde als in de code", async () => {
    const src = await functiebron();
    const ontbreekt = NIET_DRAGENDE_DOCUMENTSOORTEN.filter((s) => !src.includes(s));
    assert.deepEqual(
      ontbreekt,
      [],
      "deze soorten dragen volgens documentsoort.ts niets, maar de invariant kent ze niet; " +
        "dan is de laatste controle milder dan de poort ervoor",
    );
  });

  test("3 · een gepubliceerde kernclaim uit een navertelling wordt gevonden", async () => {
    /* DE TEGENPROEF EERST: een versie die WEL draagt mag geen bevinding
       opleveren. Zonder die stap zou deze toets ook groen worden door
       een invariant die alles afkeurt. */
    const goed = await maakDragendeVersie(db, org, { slug: "invariant-goed" });
    await publiceerRij(goed.versieId);
    assert.deepEqual(
      (await bevindingen()).filter((b) => b.soort === "kernclaim_draagt_niet"),
      [],
      "een dragende kernclaim hoort geen bevinding op te leveren",
    );

    /* EN NU DE ECHTE ZAAK: bevestigd, vastgesteld, zeker genoeg — maar
       het brondocument is een navertelling en stelt zelf niets vast.
       Dat is precies het geval dat de oude invariant doorliet, want hij
       keek alleen naar verificatie_status. */
    const fout = await maakDragendeVersie(db, org, {
      slug: "invariant-navertelling",
      documentsoort: "SECUNDAIRE_BERICHTGEVING",
    });
    await publiceerRij(fout.versieId);

    const gevonden = (await bevindingen()).filter((b) => b.soort === "kernclaim_draagt_niet");
    assert.equal(gevonden.length, 1, JSON.stringify(await bevindingen()));
    assert.match(gevonden[0]!.bevinding, /SECUNDAIRE_BERICHTGEVING/);
    assert.match(gevonden[0]!.bevinding, /stelt zelf niets vast/);

    /* DE OUDE BEVINDING VUURT HIER NIET, en dat is het punt: de claim
       staat wél op 'bevestigd'. Zou `kernclaim_onbevestigd` dit ook
       vinden, dan voegde 0044 niets toe. */
    assert.deepEqual(
      (await bevindingen()).filter((b) => b.soort === "kernclaim_onbevestigd"),
      [],
      "deze claim is bevestigd; alleen de nieuwe bevinding hoort te vuren",
    );
  });

  test("4 · een vastgestelde claim met te lage zekerheid wordt ook gevonden", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "invariant-onzeker",
      modaliteitZekerheid: NOODZAKELIJKE_ZEKERHEID - 0.1,
    });
    await publiceerRij(v.versieId);

    const gevonden = (await bevindingen()).filter(
      (b) => b.soort === "kernclaim_draagt_niet" && /onder de drempel/.test(b.bevinding),
    );
    assert.equal(gevonden.length, 1, JSON.stringify(await bevindingen()));
    assert.match(gevonden[0]!.bevinding, /0\.40/);
  });

  test("5 · een VOORSTEL als gepubliceerde kernclaim wordt gevonden", async () => {
    const v = await maakDragendeVersie(db, org, {
      slug: "invariant-voorstel",
      modaliteit: "VOORSTEL",
    });
    await publiceerRij(v.versieId);

    const gevonden = (await bevindingen()).filter(
      (b) => b.soort === "kernclaim_draagt_niet" && /voorstel en geen vaststelling/.test(b.bevinding),
    );
    assert.equal(gevonden.length, 1, JSON.stringify(await bevindingen()));
  });

  test("6 · de applicatierol mag de invariant uitvoeren", async () => {
    /* `npm run poort` en de instellingenpagina draaien hem als
       vibe_intel_app. Een invariant die alleen de eigenaar kan lezen,
       is geen poort. */
    const n = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: number }>(
        "select count(*)::int as n from intel_priv.controleer_inhoudsinvarianten()",
      );
      return r.rows[0]!.n;
    });
    assert.ok(n >= 3, `de drie zaken hierboven horen zichtbaar te zijn, gezien ${n}`);
  });
});
