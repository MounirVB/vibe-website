/* ============================================================
   INTEGRATIE — wat de volledige tekst met de versiehistorie doet
   ------------------------------------------------------------
   DE VRAAG DIE HIER WORDT BEANTWOORD. Als we van een bron die eerder
   alleen een samenvatting gaf ineens de volledige tekst ophalen, wat
   gebeurt er dan met wat er al staat?

   Het antwoord moet zijn: er komt een NIEUWE versie bij, de oude
   blijft staan, en de claims die aan de oude versie hangen veranderen
   niet. Dat laatste is eis 7 van de opdracht — bestaande bevestigingen
   mogen niet automatisch worden opgewaardeerd op grond van nieuw
   opgehaalde tekst — en het is geen toezegging maar een eigenschap van
   het model: `intel.uitspraak_bronnen` verwijst naar een `versie_id`,
   en dat id verandert niet als er een versie bijkomt.

   Deze toetsen draaien tegen een echte database en gebruiken
   `verwerkItem()` zelf, dus de versielogica die in productie draait.
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
import { verwerkItem } from "../../src/pijplijn/verzamelen.ts";
import {
  classificeerVersie,
  slaDocumentsoortOp,
} from "../../src/pijplijn/documentclassificatie.ts";
import {
  bewijskrachtPlafond,
  magZelfBevestigen,
} from "../../src/pijplijn/documentsoort.ts";
import type { RuwItem } from "../../src/bronnen/soorten.ts";

const SAMENVATTING =
  "De ACM heeft de klacht van ZonOffensief Zeeland II B.V. over het vragen van een " +
  "Power Generation Module Document door Stedin Netbeheer B.V. afgewezen.";

const VOLLEDIG =
  SAMENVATTING +
  "\n\nDe ACM stelt vast dat Stedin het document mag vragen. " +
  "Het besluit geldt per 1 januari 2027 en betreft een vermogen van 1500 kW. " +
  "De kosten van de aansluiting bedragen 45000 EUR per jaar. " +
  "Partijen kunnen binnen zes weken bezwaar maken tegen dit besluit. " +
  "De volledige motivering staat in de bijlage bij dit besluit.";

describe("de volledige tekst en de versiehistorie", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let bronId = 0;

  const item = (tekst: string | null): RuwItem => ({
    externId: "acm-geschilbesluit-zonoffensief",
    url: "https://www.acm.nl/nl/publicaties/geschilbesluit-zonoffensief-stedin",
    titel: "Geschilbesluit ZonOffensief - Stedin",
    samenvatting: SAMENVATTING,
    tekst,
    gepubliceerdOp: new Date("2026-10-20T00:00:00Z"),
    datumHerkomst: "feed",
    extra: {},
  });

  before(async () => {
    db = await maakWegwerpdatabase("volledigetekst");
    org = await maakOrganisatie(db, "vt-org");
    bronId = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const r = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron)
         values ($1,'acm-besluiten','Autoriteit Consument & Markt','rss',
                 'https://www.acm.nl/feed','https://www.acm.nl',true,'toegestaan',
                 'geen_voorbehoud','geverifieerd','fixture',5,true)
         returning id`,
        [org],
      );
      return r.rows[0]!.id;
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /** Alle versies van het ene document, op versienummer. */
  async function versies() {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        id: number; versie: number; tekst_lengte: number; inhoud_hash: string;
        wijziging_soort: string; vorige_versie_id: number | null;
        samenvatting_bron: string | null; verschil_ratio: string;
      }>(
        `select v.id, v.versie, v.tekst_lengte, v.inhoud_hash, v.wijziging_soort,
                v.vorige_versie_id, v.samenvatting_bron, v.verschil_ratio::text
           from intel.brondocument_versies v
           join intel.brondocumenten d on d.id = v.brondocument_id
          where d.bron_id = $1 order by v.versie`,
        [bronId],
      );
      return r.rows;
    });
  }

  test("1 · eerst alleen de samenvatting: versie 1", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(null), ["regelgeving"], false),
    );
    assert.equal(r.nieuwDocument, true);
    assert.equal(r.nieuweVersie, true);

    const v = await versies();
    assert.equal(v.length, 1);
    assert.equal(v[0]!.versie, 1);
    assert.equal(v[0]!.wijziging_soort, "nieuw");
    assert.equal(v[0]!.vorige_versie_id, null);
    assert.equal(v[0]!.tekst_lengte, SAMENVATTING.length);
    assert.equal(v[0]!.samenvatting_bron, SAMENVATTING);
  });

  test("2 · dezelfde samenvatting opnieuw geeft GEEN tweede versie", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(null), ["regelgeving"], false),
    );
    assert.equal(r.nieuweVersie, false, "gelijke inhoudshash -> geen versie");
    assert.equal((await versies()).length, 1);
  });

  /* ---------------------------------------------------------------
     DE KERN: een bestaande, BEVESTIGDE claim op versie 1
     --------------------------------------------------------------- */
  let versie1Id = 0;
  let claimId = 0;

  test("3 · een bevestigde claim op versie 1", async () => {
    const v = await versies();
    versie1Id = v[0]!.id;
    claimId = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const u = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            verificatie_status, bewijs_kwaliteit)
         values ($1,$2,'cijfer',12,'%','netbeheer','ongeverifieerd',4) returning id`,
        [org, "De tarieven stijgen met 12 procent."],
      );
      const id = u.rows[0]!.id;
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,'primair')`,
        [org, id, versie1Id],
      );
      await c.query(
        "update intel.uitspraken set verificatie_status = 'bevestigd' where id = $1",
        [id],
      );
      return id;
    });
    const claim = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ verificatie_status: string; bewijs_kwaliteit: number }>(
        "select verificatie_status, bewijs_kwaliteit from intel.uitspraken where id = $1",
        [claimId],
      );
      return r.rows[0]!;
    });
    assert.equal(claim.verificatie_status, "bevestigd");
    assert.equal(claim.bewijs_kwaliteit, 4);
  });

  test("4 · de volledige tekst geeft versie 2, met versie 1 nog intact", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(VOLLEDIG), ["regelgeving"], false),
    );
    assert.equal(r.nieuwDocument, false, "hetzelfde document, geen tweede");
    assert.equal(r.nieuweVersie, true);
    assert.equal(r.materieel, true, "een besluittekst met getallen is een materiele wijziging");

    const v = await versies();
    assert.equal(v.length, 2, "twee versies, niet een overschreven versie");
    assert.equal(v[0]!.id, versie1Id, "versie 1 heeft nog hetzelfde id");
    assert.equal(v[0]!.tekst_lengte, SAMENVATTING.length, "versie 1 is niet gewijzigd");
    assert.equal(v[1]!.versie, 2);
    assert.equal(v[1]!.vorige_versie_id, versie1Id, "de keten is gelegd");
    assert.ok(
      v[1]!.tekst_lengte > v[0]!.tekst_lengte,
      `versie 2 hoort langer te zijn: ${v[1]!.tekst_lengte} tegen ${v[0]!.tekst_lengte}`,
    );
    assert.notEqual(v[1]!.inhoud_hash, v[0]!.inhoud_hash);
    /* DE SAMENVATTING BLIJFT APART BEWAARD. De volledige tekst vult aan
       en overschrijft niet wat de uitgever zelf meegaf. */
    assert.equal(v[1]!.samenvatting_bron, SAMENVATTING);
  });

  test("5 · EIS 7 — de bestaande bevestiging is niet opgewaardeerd", async () => {
    const claim = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        verificatie_status: string; bewijs_kwaliteit: number; versie_id: number;
      }>(
        `select u.verificatie_status, u.bewijs_kwaliteit, ub.versie_id
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
          where u.id = $1`,
        [claimId],
      );
      return r.rows[0]!;
    });
    assert.equal(claim.verificatie_status, "bevestigd", "status ongewijzigd");
    assert.equal(claim.bewijs_kwaliteit, 4, "bewijskracht ongewijzigd — niet naar 5");
    assert.equal(
      claim.versie_id,
      versie1Id,
      "de claim hangt nog aan versie 1; nieuwe tekst verplaatst geen binding",
    );
    /* WAAROM DIT STRUCTUREEL IS EN GEEN TOEVAL. `uitspraak_bronnen`
       verwijst naar een versie_id. Een nieuwe versie krijgt een nieuw
       id, dus een bestaande binding kan er per constructie niet naar
       verschuiven. Een opwaardering zou een expliciete update op
       intel.uitspraken vragen, en die doet deze laag niet. */
  });

  test("5b · EIS 8 — ook een OFFICIEEL_BESLUIT waardeert de claim niet op", async () => {
    /* WAT V2 HIERAAN TOEVOEGT, en waarom toets 5 alleen niet genoeg is.

       Toets 5 bewees dat een nieuwe versie een bestaande binding niet
       verplaatst. Maar v2 maakt iets nieuws mogelijk: die nieuwe versie
       kan nu zelf een OFFICIEEL_BESLUIT zijn met plafond 5 en het recht
       zichzelf te bevestigen — dat is precies wat eis 3 vraagt. De
       vraag van eis 8 is of die zwaardere soort de claim eronder
       meetrekt.

       Hier wordt de ECHTE classificatiemotor op versie 2 gezet, zoals
       de taak `documentclassificatie` dat zou doen, en daarna wordt de
       claim opnieuw gemeten. */
    const v = await versies();
    const versie2 = v[1]!;

    const uitslag = classificeerVersie({
      versieId: versie2.id,
      titel: "Geschilbesluit ZonOffensief - Stedin",
      tekst: VOLLEDIG,
      canoniekeUrl:
        "https://www.acm.nl/nl/publicaties/geschilbesluit-zonoffensief-stedin",
      bronSleutel: "acm-besluiten",
      injectieVerdacht: false,
    });

    /* Eerst vastleggen dat de nieuwe versie inderdaad het zware geval
       is; anders toetst de rest hieronder niets. */
    assert.equal(uitslag.soort, "OFFICIEEL_BESLUIT", `versie 2 werd ${uitslag.soort}`);
    assert.equal(uitslag.vorm, "BEKENDMAKING");
    assert.equal(bewijskrachtPlafond(uitslag.soort, uitslag.gezag), 5);
    assert.equal(magZelfBevestigen(uitslag.soort, uitslag.gezag), true);

    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      slaDocumentsoortOp(c, org, versie2.id, uitslag),
    );

    const claim = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        verificatie_status: string;
        bewijs_kwaliteit: number;
        versie_id: number;
        primaire_bron_bevestigd: boolean;
      }>(
        `select u.verificatie_status, u.bewijs_kwaliteit, u.primaire_bron_bevestigd,
                ub.versie_id
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
          where u.id = $1`,
        [claimId],
      );
      return r.rows[0]!;
    });

    assert.equal(claim.bewijs_kwaliteit, 4, "bewijskracht blijft 4, ook naast een plafond van 5");
    assert.equal(claim.versie_id, versie1Id, "de binding blijft op versie 1");
    assert.notEqual(
      claim.primaire_bron_bevestigd,
      true,
      "een zwaardere documentsoort is geen gezien origineel",
    );

    /* EN DE VERSIE ZELF DRAAGT HET OORDEEL, zodat een audit kan zien
       waarom dit stuk wel mocht vaststellen. */
    const opgeslagen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ documentsoort: string; documentvorm: string }>(
        "select documentsoort, documentvorm from intel.brondocument_versies where id = $1",
        [versie2.id],
      );
      return r.rows[0]!;
    });
    assert.equal(opgeslagen.documentsoort, "OFFICIEEL_BESLUIT");
    assert.equal(opgeslagen.documentvorm, "BEKENDMAKING");
  });

  test("6 · dezelfde volledige tekst opnieuw geeft geen versie 3", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(VOLLEDIG), ["regelgeving"], false),
    );
    assert.equal(r.nieuweVersie, false, "idempotent op de inhoudshash");
    assert.equal((await versies()).length, 2);
  });

  test("7 · een gewijzigde brontekst geeft versie 3 met de keten erbij", async () => {
    const gewijzigd = VOLLEDIG.replace("1 januari 2027", "1 juli 2027");
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(gewijzigd), ["regelgeving"], false),
    );
    assert.equal(r.nieuweVersie, true, "een andere tekst is een nieuwe versie");
    const v = await versies();
    assert.equal(v.length, 3);
    assert.equal(v[2]!.versie, 3);
    assert.equal(v[2]!.vorige_versie_id, v[1]!.id, "keten van 3 naar 2");
    assert.equal(v[0]!.tekst_lengte, SAMENVATTING.length, "versie 1 nog steeds ongemoeid");

    /* DEZE TOETS IS ÉÉN RONDE LANG ROOD GEWEEST, en dat was de
       bedoeling.

       In de vorige ronde stond hier 'cosmetisch', met de uitleg dat
       `bepaalWijziging()` een wijziging materieel noemt als de
       verschilratio boven de drempel ligt OF als de GETALLEN
       veranderen — en "1 januari 2027" en "1 juli 2027" bevatten
       dezelfde getallen, 1 en 2027, terwijl dat ene woord in ruim 400
       tekens de ratiodrempel niet haalt. Ik heb die gemeten
       werkelijkheid toen vastgezet met de opmerking dat een latere
       reparatie hier zichtbaar rood moest worden.

       Dat is gebeurd. `bepaalWijziging()` heeft nu een derde as —
       `termijnen()` in kern/tekst.ts — en een verschoven ingangsdatum
       is daarmee materieel. Dit is de regel die de reparatie bewijst
       aan de BUITENKANT van de functie: niet in een eenheidstoets op
       de functie zelf, maar in de versierij zoals de collector hem
       wegschrijft. */
    assert.equal(
      v[2]!.wijziging_soort,
      "materieel",
      "een verschoven ingangsdatum hoort materieel te zijn",
    );
  });

  test("8 · terug naar de samenvatting geeft GEEN vierde versie", async () => {
    /* OOK DIT VERWACHTTE IK ANDERS, en de werkelijkheid is beter.
       Ik dacht dat een kortere tekst een nieuwe versie zou opleveren.
       Maar de versiehistorie is inhoudsgeadresseerd: de controle is
       `where brondocument_id = $1 and inhoud_hash = $2` over ALLE
       versies, niet alleen de laatste. De samenvatting staat al als
       versie 1, dus terugvallen op een eerder geziene toestand is een
       no-op.

       Dat is precies het gedrag dat je wil als een pagina later achter
       een inlogmuur verdwijnt: er komt geen reeks pendelende versies
       bij, en de volledige tekst blijft als versie 2 en 3 bewaard. */
    const r = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verwerkItem(c, org, bronId, "acm-besluiten", item(null), ["regelgeving"], false),
    );
    assert.equal(r.nieuweVersie, false, "deze inhoud bestond al als versie 1");
    const v = await versies();
    assert.equal(v.length, 3, "geen vierde versie");
    assert.ok(v[1]!.tekst_lengte > 400, "de volledige tekst van versie 2 staat er nog");
    assert.ok(v[2]!.tekst_lengte > 400, "en die van versie 3 ook");
  });

  test("9 · het document houdt zijn identiteit en URL over alle versies", async () => {
    const d = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        n: number; extern_id: string; canonieke_url: string; aantal_versies: number;
      }>(
        `select count(*)::int as n, min(extern_id) extern_id, min(canonieke_url) canonieke_url,
                min(aantal_versies)::int aantal_versies
           from intel.brondocumenten where bron_id = $1`,
        [bronId],
      );
      return r.rows[0]!;
    });
    assert.equal(d.n, 1, "een document, ongeacht het aantal ophalingen");
    assert.equal(d.extern_id, "acm-geschilbesluit-zonoffensief");
    assert.equal(
      d.canonieke_url,
      "https://www.acm.nl/nl/publicaties/geschilbesluit-zonoffensief-stedin",
    );
    assert.equal(d.aantal_versies, 3, "drie unieke inhouden, niet vier ophalingen");
  });
});
