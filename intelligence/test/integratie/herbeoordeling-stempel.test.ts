/* ============================================================
   INTEGRATIE — de motorversiestempel staat op de CLAIM (0048)
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, en waarom het een eigen bestand is naast
   herbeoordeling.test.ts.

   Die suite toetst of de herbeoordeling het goede oordeel berekent.
   Deze toetst of hij de claim nog VINDT. Dat is een andere vraag, en in
   productie was het antwoord nee.

   DE GEMETEN FOUT, 1 november 2026, na de v2-uitrol:

     brondocument_versies op documentsoort-v2       3753 van 3753
     claims die 'npm run herbeoordeel' selecteerde     0
     claim 29: bewijs_kwaliteit                       2
     claim 29: plafond onder v2                       1

   De greep van de poort en de selectie luidde:

     u.modaliteit_versie is distinct from <MODALITEIT_VERSIE>
     or bv.documentsoort_versie is distinct from <DOCUMENTSOORT_VERSIE>

   De tweede helft leest een veld van het BRONDOCUMENT. De taak
   `documentclassificatie` werkt dat veld bij op prioriteit 21, en
   `herbeoordeling` draait op 22. In dezelfde ronde was de greep dus al
   weg voordat de herbeoordeling keek: de classificatie WIST het
   versieverschil waarop de herbeoordeling selecteert. Niet door een
   fout in een van beide taken, maar door hun orde.

   Daarmee kon een claim permanent boven zijn plafond blijven staan
   terwijl elke telling zei dat er niets meer openstond. Dat is de
   gevaarlijkste vorm: geen rode poort, geen foutregel, en een getal dat
   op niets rust.

   0048 zette de stempel op de CLAIM — `intel.uitspraken.herbeoordeeld_onder`
   — en die is onafhankelijk van de classificatie.

   ------------------------------------------------------------
   DE TEGENPROEF ZIT IN DE TOETS

   Zaak 1 rekent de OUDE voorwaarde na tegen deze fixture en eist dat
   hij NUL vindt. Zonder die assertie zou dit bestand ook groen blijven
   als iemand de oude greep terugzet: beide voorwaarden selecteren
   immers een claim zonder stempel. Pas door te meten dat de oude greep
   deze claim MIST, wordt vastgelegd dat de reparatie draagt.

   De fixture is daarom precies de productiestand nagespeeld: de versie
   is AL geclassificeerd onder de huidige documentsoortmotor, en de
   claim draagt AL de huidige modaliteitsversie. Beide helften van de
   oude voorwaarde zijn dus onwaar.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { herbeoordeelStand } from "../../src/pijplijn/claimpoort.ts";
import { herbeoordeelClaims } from "../../src/pijplijn/herbeoordeling.ts";
import { schrijfUitspraken } from "../../src/pijplijn/uitspraken.ts";
import { bewijskrachtPlafond, DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";
import { MOTORVERSIES } from "../../src/pijplijn/motorversies.ts";

/* De tekst van claim 29 uit productie: een lobbyvoorstel aan de Tweede
   Kamer, bewaard als bevestigde claim met bewijs_kwaliteit 2. */
const CLAIM29 =
  "Schaal daarom de bestaande Flex-E-regeling op naar een Flex-E regeling XL van " +
  "structureel 125 miljoen euro per jaar (2027-2030).";

/* DE OUDE GREEP, LETTERLIJK. Hij staat hier als tekst en niet als
   verwijzing, want hij bestaat in de code niet meer. Dit is de
   voorwaarde zoals claimpoort.ts hem tot 0048 had, inclusief de join op
   brondocument_versies die hij nodig had.
   $1 = organisatie_id, $2 = MODALITEIT_VERSIE, $3 = DOCUMENTSOORT_VERSIE */
const OUDE_GREEP_SQL = `
  select count(distinct u.id)::int as n
    from intel.uitspraken u
    join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
    join intel.brondocument_versies bv on bv.id = ub.versie_id
   where u.organisatie_id = $1
     and coalesce(u.oordeel_bron, 'motor') <> 'mens'
     and (u.modaliteit_versie is distinct from $2
          or bv.documentsoort_versie is distinct from $3)`;

describe("de motorversiestempel staat op de claim", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let versieId = 0;
  let gebeurtenisId = 0;
  let claimId = 0;

  before(async () => {
    db = await maakWegwerpdatabase("stempel");
    org = await maakOrganisatie(db, "vibe-energy");

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);

      const bron = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron)
         values ($1,'netbeheer-nederland-nieuws','Netbeheer Nederland','rss',
                 'https://www.netbeheernederland.nl/feed','https://www.netbeheernederland.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',5,true)
         returning id`,
        [org],
      );
      const doc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            gepubliceerd_op)
         values ($1,$2,'flex-e-xl','https://www.netbeheernederland.nl/inbreng-netcongestie',
                 'Inbreng voor het debat Netcongestie','Netbeheer Nederland','rss',
                 '2026-10-20'::date)
         returning id`,
        [org, bron.rows[0]!.id],
      );

      /* DE VERSIE IS AL GECLASSIFICEERD, onder de HUIDIGE motor. Dat is
         het hele punt van deze fixture en niet een gemak: zo stond
         productie na de v2-uitrol, en zo is de tweede helft van de oude
         greep onwaar. */
      const versie = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-flex-e','Inbreng voor het debat Netcongestie',$3,$4,
                 'ONTWERPBESLUIT','BELANGENBEHARTIGER',$5)
         returning id`,
        [
          org,
          doc.rows[0]!.id,
          `Netcongestie vraagt om keuzes. ${CLAIM29} Het elektriciteitsnet heeft die ruimte nodig.`,
          CLAIM29.length + 60,
          DOCUMENTSOORT_VERSIE,
        ],
      );
      versieId = versie.rows[0]!.id;

      const cluster = await c.query<{ id: number }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1,'netcongestie','Netcongestie') returning id`,
        [org],
      );
      const geb = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, samenvatting, gebeurtenis_soort,
            materialiteit, onderwerp_cluster_id, aantal_bronnen)
         values ($1,'flex-e-geb','Voorstel Flex-E XL','Samenvatting','regelgeving',60,$2,1)
         returning id`,
        [org, cluster.rows[0]!.id],
      );
      gebeurtenisId = geb.rows[0]!.id;

      /* DE CLAIM ZOALS CLAIM 29 STOND: bevestigd, bewijs_kwaliteit 2,
         plafond 2 uit de oude weging, en de HUIDIGE modaliteitsversie —
         dus ook de eerste helft van de oude greep is onwaar. Alleen
         `herbeoordeeld_onder` is leeg, want dat veld bestond nog niet
         toen deze rij werd geschreven. */
      const u = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            verificatie_status, bewijs_kwaliteit, modaliteit, modaliteit_zekerheid,
            modaliteit_versie, bewijskracht_plafond, oordeel_bron)
         values ($1,$2,$3,'prijs',125000000,'EUR','netbeheer','ongeverifieerd',2,
                 'VASTGESTELD',0.80,$4,2,'motor')
         returning id`,
        [org, gebeurtenisId, CLAIM29, MODALITEIT_VERSIE],
      );
      claimId = u.rows[0]!.id;

      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,'primair')`,
        [org, claimId, versieId],
      );
      /* Pas NA de primaire binding mag hij bevestigd zijn; de trigger
         uitspraken_bewijsplicht weigert dat anders. */
      await c.query(
        "update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1",
        [claimId],
      );
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** De drie claiminvarianten uit 0048, als lijst van soorten. */
  async function claiminvarianten(): Promise<string[]> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ soort: string; bevinding: string }>(
        "select soort, bevinding from intel_priv.controleer_claiminvarianten($1)",
        [MOTORVERSIES],
      );
      return r.rows.map((x) => `${x.soort}: ${x.bevinding}`);
    });
  }

  /** De bewaarde kracht, het plafond en de stempel van claim 29. */
  async function claim(): Promise<{
    bewijs_kwaliteit: number;
    bewijskracht_plafond: number | null;
    herbeoordeeld_onder: string | null;
    verificatie_status: string;
  }> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        bewijs_kwaliteit: number;
        bewijskracht_plafond: number | null;
        herbeoordeeld_onder: string | null;
        verificatie_status: string;
      }>(
        `select bewijs_kwaliteit, bewijskracht_plafond, herbeoordeeld_onder, verificatie_status
           from intel.uitspraken where id = $1`,
        [claimId],
      );
      return r.rows[0]!;
    });
  }

  /* ---------------------------------------------------------------
     1 · de tegenproef: de oude greep mist deze claim
     --------------------------------------------------------------- */
  test("1 · de oude greep op het brondocument ziet nul, de stempel op de claim ziet één", async () => {
    const oud = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: number }>(OUDE_GREEP_SQL, [
        org,
        MODALITEIT_VERSIE,
        DOCUMENTSOORT_VERSIE,
      ]);
      return r.rows[0]!.n;
    });
    assert.equal(
      oud,
      0,
      "aanname van deze toets: de oude greep MIST deze claim. Vindt hij hem wel, dan is de " +
        "fixture niet meer de productiestand en bewijst dit bestand niets",
    );

    const nieuw = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(
      nieuw.openstaand,
      1,
      "de stempel op de claim hoort hem wél te vinden; dat is de hele reparatie van 0048",
    );
    assert.equal(nieuw.motorversies, MOTORVERSIES);
  });

  /* ---------------------------------------------------------------
     2 · de invariant maakt de stille fout zichtbaar
     --------------------------------------------------------------- */
  test("2 · de claiminvariant meldt de kracht boven het plafond en de achterstand", async () => {
    const bevindingen = await claiminvarianten();
    assert.ok(
      bevindingen.some((b) => b.startsWith("herbeoordeling_achter")),
      `de achterstand hoort gemeld te worden: ${bevindingen.join(" | ")}`,
    );

    /* EN DE KRACHT STAAT NOG NIET BOVEN HET PLAFOND, want de oude weging
       zette plafond 2 bij kracht 2. Dat is precies waarom de eerste tak
       alleen niet volstond: de stille fout was dat het PLAFOND verouderd
       was, niet dat de kracht erboven stond. Onder v2 wordt het plafond
       1 en pas dan zou tak 1 vuren — als de ronde niet liep. */
    assert.equal(
      bevindingen.filter((b) => b.startsWith("bewijskracht_boven_plafond")).length,
      0,
      "met het oude plafond van 2 is kracht 2 niet te hoog; de achterstand is het signaal",
    );
  });

  /* ---------------------------------------------------------------
     3 · de ronde corrigeert claim 29 van 2 naar 1
     --------------------------------------------------------------- */
  test("3 · één ronde verlaagt de bewijskracht naar het v2-plafond en zet de stempel", async () => {
    const voor = await claim();
    assert.equal(voor.bewijs_kwaliteit, 2, "aanname: de claim staat op de productiewaarde");
    assert.equal(voor.herbeoordeeld_onder, null, "aanname: hij is nooit gestempeld");

    const rapport = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(rapport.herbeoordeeld, 1, "er hoort precies één claim gewogen te zijn");
    assert.equal(rapport.bewijskrachtVerlaagd, 1);

    const na = await claim();
    assert.equal(
      na.bewijskracht_plafond,
      bewijskrachtPlafond("ONTWERPBESLUIT", "BELANGENBEHARTIGER"),
      "het plafond hoort van de huidige motor te komen",
    );
    assert.equal(na.bewijskracht_plafond, 1, "ONTWERPBESLUIT bij BELANGENBEHARTIGER geeft 1");
    assert.equal(na.bewijs_kwaliteit, 1, "de verwachte correctie: van 2 naar 1");
    assert.equal(na.herbeoordeeld_onder, MOTORVERSIES, "de stempel hoort nu op de claim te staan");

    /* EN DE BEVESTIGING IS INGETROKKEN: een lobbyvoorstel mag zichzelf
       niet bevestigen. De richting is eenzijdig, dus dit kan alleen deze
       kant op. */
    assert.equal(na.verificatie_status, "ongeverifieerd");
  });

  /* ---------------------------------------------------------------
     4 · daarna is de poort open en zijn de invarianten leeg
     --------------------------------------------------------------- */
  test("4 · na de ronde staat er niets open en meldt de invariant niets", async () => {
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(stand.openstaand, 0, "de poort hoort open te staan");
    assert.deepEqual(await claiminvarianten(), [], "0 bevindingen, en 0 is een geldige meting");
  });

  /* ---------------------------------------------------------------
     5 · idempotentie
     --------------------------------------------------------------- */
  test("5 · een tweede en een derde ronde zien niets nieuws", async () => {
    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    const derde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(tweede.herbeoordeeld, 0, "een tweede ronde hoort niets te vinden");
    assert.equal(derde.herbeoordeeld, 0);

    /* EN DE WAARDE IS NIET VERDER GEZAKT. Een ronde die elke keer
       min(kracht, plafond) opnieuw toepast op zijn eigen uitkomst zou
       stil naar nul lopen; dat is de reden dat idempotentie hier over de
       WAARDE gaat en niet alleen over de telling. */
    const na = await claim();
    assert.equal(na.bewijs_kwaliteit, 1, "de waarde hoort stabiel te zijn");
    assert.equal(na.herbeoordeeld_onder, MOTORVERSIES);
  });

  /* ---------------------------------------------------------------
     6 · een motorversiewissel maakt de claim weer selecteerbaar
     --------------------------------------------------------------- */
  test("6 · een oudere stempel wordt opnieuw geselecteerd, en de poort valt tot die tijd dicht", async () => {
    /* ZO ZIET EEN VERSIEWISSEL ERUIT vanuit de database: de code krijgt
       een nieuwe MOTORVERSIES en elke bestaande claim draagt dan een
       stempel die daarvan verschilt. Dat is hier nagespeeld door de
       stempel terug te zetten in plaats van de constante te veranderen —
       een constante is in TypeScript niet te wijzigen, en een toets die
       de code aanpast meet zichzelf. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        "update intel.uitspraken set herbeoordeeld_onder = $2 where id = $1",
        [claimId, "documentsoort-v1 + claimmodaliteit-v1"],
      );
    });

    const dicht = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(dicht.openstaand, 1, "een oudere stempel hoort de poort te sluiten");

    const achter = await claiminvarianten();
    assert.ok(
      achter.some((b) => /herbeoordeling_achter.*documentsoort-v1/.test(b)),
      `de invariant hoort de oude motor te noemen: ${achter.join(" | ")}`,
    );

    const ronde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(ronde.herbeoordeeld, 1, "de wissel hoort de claim opnieuw te laten wegen");

    const open = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(open.openstaand, 0, "en daarna staat de poort weer open");
  });

  /* ---------------------------------------------------------------
     7 · een nieuwe claim draagt de stempel bij zijn geboorte
     --------------------------------------------------------------- */
  test("7 · schrijfUitspraken stempelt een nieuwe claim, anders hangt de poort dicht", async () => {
    /* WAAROM DIT ERBIJ HOORT. Een nieuwe claim wordt niet herbeoordeeld
       — hij wordt bij zijn geboorte al door de huidige motor gewogen.
       Zou schrijfUitspraken() de stempel niet zetten, dan zou de poort
       dichtvallen zodra de pijplijn één nieuw document verwerkt, en zou
       er een herbeoordelingsronde nodig zijn voor een claim die net
       gewogen is. Dat is geen theorie: de eerste opzet van 0048 deed dit
       niet en liet tien integratietoetsen omvallen. */
    const rapport = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      schrijfUitspraken(c, org, {
        versieId,
        gebeurtenisId,
        titel: "Inbreng voor het debat Netcongestie",
        /* DEZE ZIN LEVERT ECHT EEN CLAIM OP. Gemeten met
           extraheerUitspraken(): een zin met het getal uitgeschreven in
           woorden levert er geen, en dan zou deze zaak groen worden op
           nul geschreven claims -- een toets die niets toetst. */
        tekst:
          "Netbeheer Nederland vraagt de Kamer om ruimte. " +
          "De tarieven voor 2027 zijn vastgesteld op 12%.",
        onderwerp: "netbeheer",
        risicoKlasse: "laag",
        isPrimaireBron: true,
        betrouwbaarheid: 5,
        documentsoort: "ONTWERPBESLUIT",
        gezag: "BELANGENBEHARTIGER",
        documentvorm: "ONTWERP",
        bronSleutel: "netbeheer-nederland-nieuws",
        peildatum: "2026-10-20",
      }),
    );
    assert.ok(
      rapport.aangemaakt >= 1,
      `er hoort een claim geschreven te zijn: ${JSON.stringify(rapport)}`,
    );

    const zonderStempel = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where organisatie_id = $1 and herbeoordeeld_onder is distinct from $2
            and coalesce(oordeel_bron,'motor') <> 'mens'`,
        [org, MOTORVERSIES],
      );
      return r.rows[0]!.n;
    });
    assert.equal(zonderStempel, 0, "elke nieuw geschreven claim hoort de stempel te dragen");

    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelStand(c, org),
    );
    assert.equal(
      stand.openstaand,
      0,
      "de pijplijn mag de claimpoort niet dichtzetten door normaal werk te doen",
    );
  });
});
