/* ============================================================
   INTEGRATIE — de tweede poort: goedkeuren en publiceren
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, en waarom het een eigen bestand is.

   De claimpoort stond vóór de lagen die bewijs WEGEN: de besluitmotor,
   de nieuwsselectie, de voorstellenlaag, de conceptgeneratie.
   Goedkeuren en publiceren wegen geen bewijs — ze LEUNEN op een weging
   die eerder is gedaan en in een kolom is opgeslagen. Tussen die twee
   momenten zit menselijke tijd, en in dat venster kan de populatie
   veranderen.

   De vijftien zaken uit sectie 5 van de acceptatieopdracht staan
   hieronder genummerd. Ze draaien tegen een ECHTE database en via de
   WERKELIJKE ingangen — `keurGoed()`, `publiceer()`,
   `hertoetsInhoudVersie()`, `nieuwsselectieronde()` en
   `herbeoordeelClaims()` — en niet tegen losse hulpfuncties. Een toets
   op `claimDraagt()` alleen zou bewijzen dat de regel bestaat, niet dat
   de keten hem gebruikt; dat laatste is precies wat de audit vond.

   EEN UITZONDERING, EERLIJK BENOEMD: zaak 14 bouwt de kloon van de
   schaalcorrectie met de hand, langs exact de kolomlijst die
   schaalcorrectie.ts kopieert. `herstelSchaal()` zoekt namelijk zelf
   naar schaalwoorden in een brontekst, en die opzet zou de vraag
   verdoezelen -- welke velden MOGEN mee en welke niet.

   ELKE ZAAK KRIJGT EEN EIGEN SLUG, want alle zaken delen één
   wegwerpdatabase. Dat is in dit platform al eens misgegaan: een
   fixture van een eerdere zaak werd door een latere gevonden en de
   uitslag leek te kloppen.
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
import { keurGoed, publiceer } from "../../src/inhoud/publiceer.ts";
import { hertoetsInhoudVersie } from "../../src/inhoud/concept.ts";
import {
  bewijsDraagt,
  herbeoordeelStand,
  toetsGebondenBewijs,
} from "../../src/pijplijn/claimpoort.ts";
import { herbeoordeelClaims } from "../../src/pijplijn/herbeoordeling.ts";
import { nieuwsselectieronde } from "../../src/pijplijn/nieuwsselectie.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";

describe("de tweede poort: goedkeuren en publiceren wegen de actuele claim", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let analist = 0;

  before(async () => {
    db = await maakWegwerpdatabase("goedkeurpoort");
    org = await maakOrganisatie(db, "goedkeurpoort-org");
    auteur = await maakGebruiker(db, org, "auteur@test.nl", "redacteur");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    analist = await maakGebruiker(db, org, "analist@test.nl", "lezer");
  });

  after(async () => {
    await db.opruimen();
  });

  /** Zet een versie klaar die draagt, en geeft de ids terug. */
  async function klaar(slug: string, extra: Record<string, unknown> = {}) {
    return maakDragendeVersie(db, org, { slug, aangemaaktDoor: auteur, ...extra });
  }

  /** Eén veld van een claim wijzigen, als eigenaar. */
  async function zetClaim(uitspraakId: number, kolom: string, waarde: unknown): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      /* De kolomnaam komt uit deze testcode en nooit uit invoer; een
         bindparameter kan geen identifier zijn. */
      await c.query(`update intel.uitspraken set ${kolom} = $2 where id = $1`, [
        uitspraakId,
        waarde,
      ]);
    });
  }

  /** De 'automatisch_geblokkeerd'-besluiten van één versie. */
  async function blokkadebesluiten(versieId: number): Promise<{ motivatie: string }[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ motivatie: string }>(
        `select motivatie from intel.publicatiebesluiten
          where inhoud_versie_id = $1 and besluit = 'automatisch_geblokkeerd'
          order by id`,
        [versieId],
      );
      return r.rows;
    });
  }

  /* ---------------------------------------------------------------
     1 · geldig bij de conceptgeneratie, ongeldig vóór de goedkeuring
     --------------------------------------------------------------- */
  test("1 · een claim die ná de conceptbouw zijn bevestiging verliest blokkeert de goedkeuring", async () => {
    const v = await klaar("zaak-1");

    /* Eerst aantonen dat het bewijs op dit moment WEL draagt. Zonder
       deze tegenproef zou de toets ook groen worden als de poort altijd
       dicht staat, en dan bewijst hij niets. */
    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      toetsGebondenBewijs(c, org, v.versieId),
    );
    assert.ok(bewijsDraagt(voor), `vooraf hoort het te dragen: ${voor.blokkades.join(" | ")}`);

    await zetClaim(v.uitspraakId, "verificatie_status", "ingetrokken");

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "ziet er goed uit"),
    );
    assert.equal(uitslag.goedgekeurd, false, "een ingetrokken kernclaim mag niet goedkeuren");
    assert.ok(
      !uitslag.goedgekeurd && uitslag.blokkades.some((b) => /ingetrokken/.test(b)),
      `de reden hoort de status te noemen: ${uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")}`,
    );

    /* DE STATUS IS NIET VERANDERD. Een geblokkeerde goedkeuring die wél
       de status zet, is erger dan geen blokkade. */
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ status: string; goedgekeurd_door: number | null }>(
        "select status, goedgekeurd_door from intel.inhoud_versies where id = $1",
        [v.versieId],
      );
      return r.rows[0]!;
    });
    assert.equal(stand.status, "ter_review");
    assert.equal(stand.goedgekeurd_door, null);

    /* EN DE BLOKKADE IS VASTGELEGD. Dit is de reden dat keurGoed() een
       uitslag teruggeeft in plaats van te gooien: een exceptie zou deze
       auditregel meeslepen in de rollback. */
    const besluiten = await blokkadebesluiten(v.versieId);
    assert.equal(besluiten.length, 1, "er hoort precies één blokkadebesluit te staan");
    assert.match(besluiten[0]!.motivatie, /goedkeuring geblokkeerd door de claimpoort/);
  });

  /* ---------------------------------------------------------------
     2 · geldig bij de goedkeuring, ongeldig vóór de publicatie
     --------------------------------------------------------------- */
  test("2 · een claim die ná de goedkeuring zijn bevestiging verliest blokkeert de publicatie", async () => {
    const v = await klaar("zaak-2");
    const goed = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "nagelopen"),
    );
    assert.equal(goed.goedgekeurd, true, "de goedkeuring hoort nu wel te slagen");

    await zetClaim(v.uitspraakId, "verificatie_status", "tegengesproken");

    const r = await publiceer(db.pool, org, v.versieId);
    assert.equal(r.geschreven, false, "er mag niets geschreven zijn");
    assert.match(r.reden, /het bewijs draagt niet meer/);
    assert.match(r.reden, /tegengesproken/);

    const besluiten = await blokkadebesluiten(v.versieId);
    assert.ok(
      besluiten.some((b) => /publicatie geblokkeerd/.test(b.motivatie)),
      "de publicatieblokkade hoort in het besluitenlogboek te staan",
    );
  });

  /* ---------------------------------------------------------------
     3 en 4 · een herbeoordeling TIJDENS een poging
     --------------------------------------------------------------- */
  test("3 · een herbeoordeling kan niet tussen de lezing en de statuswijziging glippen", async () => {
    const v = await klaar("zaak-3");

    /* DE RACE, ECHT NAGESPEELD MET TWEE VERBINDINGEN.
       Transactie A leest de gebonden claims met 'for share of u' en
       houdt die rijen vast. Verbinding B probeert dezelfde rij te
       updaten — wat een herbeoordeling doet — met een korte
       lock_timeout. Die update MOET falen zolang A loopt. Faalt hij
       niet, dan bestaat de ordening 'lees, intrek, schrijf' en is de
       goedkeuring aan ingetrokken bewijs te binden. */
    const a = await db.pool.connect();
    let bGeblokkeerd = false;
    try {
      await a.query("begin");
      await a.query("select set_config('app.organisatie_id', $1, true)", [String(org)]);
      const uitslag = await toetsGebondenBewijs(a, org, v.versieId);
      assert.ok(bewijsDraagt(uitslag), "binnen de transactie hoort het bewijs te dragen");

      const b = await db.pool.connect();
      try {
        await b.query("begin");
        await b.query("select set_config('app.organisatie_id', $1, true)", [String(org)]);
        await b.query("set local lock_timeout = '300ms'");
        await b.query("update intel.uitspraken set verificatie_status = 'ingetrokken' where id = $1", [
          v.uitspraakId,
        ]);
        await b.query("commit");
      } catch (e) {
        bGeblokkeerd = (e as { code?: string }).code === "55P03";
        await b.query("rollback").catch(() => undefined);
      } finally {
        b.release();
      }
      await a.query("commit");
    } finally {
      a.release();
    }

    assert.ok(
      bGeblokkeerd,
      "een gelijktijdige herbeoordeling hoort op het gedeelde slot te wachten (55P03)",
    );

    /* EN DE CLAIM IS ONGEMOEID: de update is niet half doorgekomen. */
    const nog = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ verificatie_status: string }>(
        "select verificatie_status from intel.uitspraken where id = $1",
        [v.uitspraakId],
      );
      return r.rows[0]!.verificatie_status;
    });
    assert.equal(nog, "bevestigd");
  });

  test("4 · een openstaande herbeoordeling blokkeert zowel goedkeuren als publiceren", async () => {
    const v = await klaar("zaak-4");

    /* EEN TWEEDE CLAIM IN DEZELFDE ORGANISATIE die nog niet gewogen is.
       Hij hangt NIET aan dit concept. Dat is het punt: een score
       vergelijkt met andere gebeurtenissen, dus een gemengde populatie
       maakt ook de weging van DIT concept onbetrouwbaar. */
    const ander = await klaar("zaak-4-ander");
    await zetClaim(ander.uitspraakId, "modaliteit_versie", null);

    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.ok(stand.openstaand > 0, "de poort hoort nu dicht te staan");

    const goed = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "toch maar even"),
    );
    assert.equal(goed.goedgekeurd, false);
    assert.ok(
      !goed.goedgekeurd && goed.blokkades.some((b) => /wachten nog op herbeoordeling/.test(b)),
      "de reden hoort de openstaande herbeoordeling te noemen",
    );

    /* EN ER IS GEEN TERUGVAL. De foutregel mag niet naar de oude
       uitgeversbetrouwbaarheid wijzen als uitweg. */
    assert.ok(
      !goed.goedgekeurd &&
        goed.blokkades.some((b) => /npm run herbeoordeel/.test(b)) &&
        !goed.blokkades.some((b) => /negeer|overslaan|forceer/i.test(b)),
      "de uitweg is de herbeoordeling draaien, niet een vlag",
    );

    // Opruimen, zodat de volgende zaken niet op deze poort stuiten.
    await zetClaim(ander.uitspraakId, "modaliteit_versie", MODALITEIT_VERSIE);
    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(na.openstaand, 0, "aanname: de poort staat weer open");
  });

  /* ---------------------------------------------------------------
     5 · conceptbewerking na gewijzigde claimstatus
     --------------------------------------------------------------- */
  test("5 · een hertoets na een gewijzigde claim zet poorten_geslaagd op false", async () => {
    const v = await klaar("zaak-5");

    const voor = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );
    assert.ok(voor !== null, "de versie hoort te bestaan");

    await zetClaim(v.uitspraakId, "modaliteit", "VOORSTEL");

    const na = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );
    assert.ok(na !== null);
    assert.equal(na.poortenGeslaagd, false, "een voorstel als kernclaim mag niet door de poort");
    assert.ok(
      na.blokkades.some((b) => /kernclaim_heeft_bewijs|draagt niet/.test(b)),
      `de blokkade hoort de kernclaim te noemen: ${na.blokkades.join(" | ")}`,
    );

    /* EN DE KOLOM IN DE DATABASE IS MEE GEZAKT. publiceer() leest die
       kolom; blijft hij op true staan, dan is de hertoets cosmetisch. */
    const kolom = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ poorten_geslaagd: boolean }>(
        "select poorten_geslaagd from intel.inhoud_versies where id = $1",
        [v.versieId],
      );
      return r.rows[0]!.poorten_geslaagd;
    });
    assert.equal(kolom, false);
  });

  /* ---------------------------------------------------------------
     6 · verouderde classificatieversie
     --------------------------------------------------------------- */
  test("6 · een documentclassificatie van een oudere motorversie blokkeert", async () => {
    const v = await klaar("zaak-6");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.brondocument_versies set documentsoort_versie = $2 where id = $1",
        [v.bronVersieId, "documentsoort-v0"],
      );
    });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "oude classificatie"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd &&
        uitslag.blokkades.some((b) => b.includes("documentsoort-v0") && b.includes(DOCUMENTSOORT_VERSIE)),
      "de reden hoort beide versies te noemen",
    );

    /* HERSTELLEN, EN DAT IS GEEN NETHEID.
       Alle zaken delen één wegwerpdatabase. Een verouderde
       classificatieversie die blijft staan, zet de POPULATIEpoort dicht
       voor elke latere zaak — en dan faalt die zaak op een reden die
       niets met zijn eigen opstelling te maken heeft. Dat gebeurde hier
       werkelijk: zaak 6b en zaak 15 vielen erop om, en hun melding
       wees naar deze regel. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.brondocument_versies set documentsoort_versie = $2 where id = $1",
        [v.bronVersieId, DOCUMENTSOORT_VERSIE],
      );
    });
    const herstel = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(herstel.openstaand, 0, "aanname: de populatie is weer heel");
  });

  test("6b · een menselijk modaliteitsoordeel blijft geldig zonder motorversie", async () => {
    const v = await klaar("zaak-6b");
    /* EIS 3 VAN DE OPDRACHT: een menselijke beoordeling wordt niet
       overschreven, en dus ook niet stilzwijgend ongeldig verklaard.
       Een mens die de modaliteit heeft vastgesteld, heeft dat gedaan —
       daar hoort geen motorversie bij. De DOCUMENTclassificatie is
       machinewerk en moet wél actueel zijn. */
    await zetClaim(v.uitspraakId, "oordeel_bron", "mens");
    await zetClaim(v.uitspraakId, "modaliteit_versie", null);

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "door een mens gewogen"),
    );
    assert.equal(
      uitslag.goedgekeurd,
      true,
      `een menselijk oordeel hoort te blijven staan: ${
        uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")
      }`,
    );
  });

  /* ---------------------------------------------------------------
     7 · ontbrekende modaliteit
     --------------------------------------------------------------- */
  test("7 · een kernclaim zonder modaliteit draagt niet", async () => {
    const v = await klaar("zaak-7");
    await zetClaim(v.uitspraakId, "modaliteit", null);

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "zonder modaliteit"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd && uitslag.blokkades.some((b) => /modaliteit is niet beoordeeld/.test(b)),
      `verwacht de modaliteitsreden: ${uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")}`,
    );
  });

  /* ---------------------------------------------------------------
     8 · verlaagd bewijskrachtplafond
     --------------------------------------------------------------- */
  test("8 · bewijskracht boven het plafond is de oude uitgeversbetrouwbaarheid", async () => {
    const v = await klaar("zaak-8", { bewijsKwaliteit: 5, bewijskrachtPlafond: 2 });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "met een te hoge bewijskracht"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd &&
        uitslag.blokkades.some((b) => /boven zijn plafond/.test(b) && /oude uitgever/.test(b)),
      `verwacht de plafondreden: ${uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")}`,
    );
  });

  test("8b · een ontbrekend plafond is geen vrijbrief", async () => {
    const v = await klaar("zaak-8b", { bewijskrachtPlafond: null });
    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "zonder plafond"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd &&
        uitslag.blokkades.some((b) => /geen bewijskrachtplafond/.test(b)),
      "een lege kolom hoort te blokkeren en niet door te laten",
    );
  });

  /* ---------------------------------------------------------------
     9 · gewijzigde bronbinding
     --------------------------------------------------------------- */
  test("9 · een claim zonder primaire bronbinding draagt niets", async () => {
    const v = await klaar("zaak-9");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      /* De binding naar 'bevestigend' zetten in plaats van verwijderen:
         zo blijft de rij bestaan en is de toets scherper — de vraag is
         of de poort de ROL leest en niet alleen het bestaan. */
      await c.query(
        "update intel.uitspraak_bronnen set rol = 'bevestigend' where uitspraak_id = $1",
        [v.uitspraakId],
      );
    });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "binding verschoven"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd &&
        uitslag.blokkades.some((b) => /geen primaire bronbinding meer/.test(b)),
      `verwacht de bindingsreden: ${uitslag.goedgekeurd ? "" : uitslag.blokkades.join(" | ")}`,
    );
  });

  test("9b · een bronversie buiten de vastgelegde invoer blokkeert", async () => {
    const v = await klaar("zaak-9b");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.inhoud_versies set invoer_versies = '{}' where id = $1", [
        v.versieId,
      ]);
    });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "invoerlijst leeggehaald"),
    );
    assert.equal(uitslag.goedgekeurd, false);
    assert.ok(
      !uitslag.goedgekeurd &&
        uitslag.blokkades.some((b) => /niet in de vastgelegde invoer/.test(b)),
      "de bronnenlijst onder het artikel moet de lijst zijn waaruit het bewijs komt",
    );
  });

  /* ---------------------------------------------------------------
     10, 11, 12 · de bevoegdheid blijft onveranderd streng
     --------------------------------------------------------------- */
  test("10 · een onbevoegde goedkeurder wordt geweigerd, en dat blijft een exceptie", async () => {
    const v = await klaar("zaak-10");
    /* EEN UITZONDERING EN GEEN UITSLAG. Bewijs dat niet draagt is een
       normale uitkomst; een account zonder recht dat probeert vrij te
       geven is dat niet. Die moet HARD falen en niet als een nette
       verdictregel terugkomen die een aanroeper kan negeren. */
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, v.versieId, analist, "ik vind het mooi"),
        ),
      /inhoud\.goedkeuren/,
    );
  });

  test("11 · de maker kan zijn eigen concept niet goedkeuren", async () => {
    const v = await klaar("zaak-11");
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, v.versieId, auteur, "eigen werk"),
        ),
      /vier ogen|zelf aangemaakt/i,
    );
  });

  test("12 · hoog risico vraagt een eigen recht", async () => {
    const v = await klaar("zaak-12", { risico: "hoog" });
    const redacteur = await maakGebruiker(db, org, "red2@test.nl", "redacteur");
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, v.versieId, redacteur, "hoog risico door een redacteur"),
        ),
      /hoogrisico/,
    );
  });

  /* ---------------------------------------------------------------
     13 · een ongeverifieerde claim met hogere historische bewijskracht
     --------------------------------------------------------------- */
  test("13 · een ongeverifieerde claim met bewijskracht 5 tilt de bewijsdrempel niet", async () => {
    /* DE OPSTELLING, zo gekozen dat het verschil BINDEND is.
       Naast een dragende claim met bewijskracht 3 komt een
       ONGEVERIFIEERDE claim met de oude, uit de uitgever afgeleide
       bewijskracht 5 op dezelfde gebeurtenis.

       De oude aggregatie nam max(bewijs_kwaliteit) over ALLE claims en
       zou dus 5 lezen; daarmee haalde de gebeurtenis de harde poort
       `besteBewijskwaliteit >= 4` op kracht van een claim die nergens
       voor staat. De nieuwe formulering leest 3 en wijst af.

       Dit loopt door de ECHTE ingang, nieuwsselectieronde(), en niet
       door een kopie van de query in deze test: een nagebouwde query
       kan groen blijven terwijl de echte uiteenloopt. Daarom zijn de
       drempels eromheen ook echt gehaald -- cluster, relevantie,
       soort, materialiteit -- want alleen de EERSTE afwijsgrond wordt
       geteld en anders zou de bewijsgrond nooit bovenaan komen. */
    const v = await klaar("zaak-13", { bewijsKwaliteit: 3, bewijskrachtPlafond: 3 });

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const cluster = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1, 'subsidie-13', 'Subsidies') returning id`,
        [org],
      );
      const g = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, materialiteit,
            bedrijfsrelevantie, relevantie_categorie, relevantie_grondslag,
            onderwerp_cluster_id, aantal_bronnen, risico_klasse)
         values ($1, 'zaak-13', 'Een gebeurtenis voor de bewijsaggregatie', 'regelgeving',
                 70, 8, 'regelgeving', $3::jsonb, $2, 1, 'laag')
         returning id`,
        /* `gebeurtenissen_relevantie_heeft_grondslag` (0019 regel 86)
           eist een niet-lege grondslag zodra er een categorie staat:
           een relevantieoordeel zonder onderbouwing is geen oordeel. */
        [org, cluster.rows[0]!.id, JSON.stringify({ uitleg: "fixture" })],
      );
      const gid = g.rows[0]!.id;
      await c.query("update intel.uitspraken set gebeurtenis_id = $2 where id = $1", [
        v.uitspraakId,
        gid,
      ]);

      /* DE ONGEVERIFIEERDE CLAIM MET DE OUDE KRACHT. Eerst binden, dan
         pas de bewijskracht: hij blijft ongeverifieerd, dus de
         bewijsplichttrigger raakt hem niet, maar de primaire binding
         hoort er wel te zijn om de rij representatief te maken. */
      const u = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            verificatie_status, bewijs_kwaliteit, modaliteit, modaliteit_zekerheid,
            modaliteit_versie, bewijskracht_plafond)
         values ($1, $2, $3, 'cijfer', 125, 'EUR', 'subsidie', 'ongeverifieerd', 5,
                 'VASTGESTELD', 0.90, $4, 5)
         returning id`,
        [org, gid, "Schaal de regeling op naar 125 miljoen euro per jaar.", MODALITEIT_VERSIE],
      );
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1, $2, $3, 'primair')`,
        [org, u.rows[0]!.id, v.bronVersieId],
      );
      /* GEEN gebeurtenis_documenten. Die tabel voedt alleen de
         component 'onafhankelijke bronnen' en de bronsleutelkaart, en
         beide komen NA de bewijsdrempel. Een rij erbij zou de fixture
         groter maken zonder de vraag te raken. */
    });

    const rapport = await nieuwsselectieronde(db.pool, org, {
      droog: true,
      eigenaren: new Map(),
      bronsoortPerSleutel: new Map(),
      bestaandeNieuwsSlugs: new Set(),
    });

    const gronden = Object.keys(rapport.perAfwijsgrond);
    assert.ok(
      gronden.some((g) => /beste bewijskwaliteit N ligt onder de drempel N/.test(g)),
      `de bewijsgrond hoort bindend te zijn; gevonden: ${gronden.join(" ;; ")}`,
    );
    assert.equal(rapport.geschikt, 0, "niets hoort geschikt te zijn op kracht van een lege claim");
  });

  /* ---------------------------------------------------------------
     14 · schaalcorrectie met gewijzigde claiminhoud
     --------------------------------------------------------------- */
  test("14 · een schaalcorrectiekloon erft de classificatie maar niet het mensoordeel", async () => {
    const v = await klaar("zaak-14");
    await zetClaim(v.uitspraakId, "oordeel_bron", "mens");

    /* DE KLOON MET DE HAND, langs exact de kolommen die
       schaalcorrectie.ts kopieert. Dat is met opzet: herstelSchaal()
       zoekt zelf naar schaalwoorden in de brontekst en die fixture zou
       de vraag hier verdoezelen. Wat getoetst wordt is de EIS: welke
       velden mogen mee en welke niet. */
    const kloonId = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            verificatie_status, bewijs_kwaliteit,
            modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
            bewijskracht_plafond, oordeel_bron)
         select organisatie_id, gebeurtenis_id, tekst, soort, 4000, eenheid, onderwerp,
                'ongeverifieerd', bewijs_kwaliteit,
                modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
                bewijskracht_plafond, 'motor'
           from intel.uitspraken where id = $1
         returning id`,
        [v.uitspraakId],
      );
      const id = r.rows[0]!.id;
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1, $2, $3, 'primair')`,
        [org, id, v.bronVersieId],
      );
      /* EERST BINDEN, DAN DE STATUS. `alsEigenaar` opent geen
         transactie, dus elke opdracht commit los -- en dan vuurt de
         DEFERRED constraint trigger `uitspraken_bewijsplicht` al bij de
         insert, voordat de binding bestaat. De echte schaalcorrectie
         loopt binnen metOrganisatie() en heeft dat probleem niet. */
      await c.query(
        "update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1",
        [id],
      );
      return id;
    });

    const kloon = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        modaliteit: string | null;
        modaliteit_versie: string | null;
        bewijskracht_plafond: number | null;
        oordeel_bron: string | null;
      }>(
        `select modaliteit, modaliteit_versie, bewijskracht_plafond, oordeel_bron
           from intel.uitspraken where id = $1`,
        [kloonId],
      );
      return r.rows[0]!;
    });

    assert.equal(kloon.modaliteit, "VASTGESTELD", "de tekst is gelijk, dus de modaliteit ook");
    assert.equal(
      kloon.modaliteit_versie,
      MODALITEIT_VERSIE,
      "de motorversie gaat mee; anders valt de claimpoort dicht na een schaalcorrectie",
    );
    assert.equal(kloon.bewijskracht_plafond, 4, "het plafond hangt aan documentsoort x gezag");
    assert.equal(
      kloon.oordeel_bron,
      "motor",
      "een mensoordeel over de OUDE waarde mag niet meeliften naar een nieuwe waarde",
    );

    /* EN DE POORT BLIJFT OPEN. Dat is de hele reden dat die velden
       meegaan: een schaalcorrectie hoort het nieuwskanaal niet stil te
       leggen. */
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(
      stand.openstaand,
      0,
      "een kloon met overgenomen motorversie hoort de claimpoort niet te sluiten",
    );
  });

  /* ---------------------------------------------------------------
     15 · herhaalde herbeoordeling en idempotentie
     --------------------------------------------------------------- */
  test("15 · een tweede en derde herbeoordelingsronde zien niets nieuws", async () => {
    const eerste = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    const derde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );

    assert.equal(eerste.bekeken, 0, "na alle zaken hierboven staat niets meer open");
    assert.equal(tweede.bekeken, 0);
    assert.equal(derde.bekeken, 0);
    assert.equal(tweede.herbeoordeeld, 0);
    assert.equal(derde.herbeoordeeld, 0);

    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(stand.openstaand, 0);
  });
});
