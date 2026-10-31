/* ============================================================
   ADVERSARIEEL — mag een nieuwsbericht een JURIDISCHE claim bevestigen?
   ------------------------------------------------------------
   HET GEMETEN GAT. Documentsoort-v2 sloot de route waarlangs een
   nieuwsbericht de authentieke regeling kón worden. Maar negen van de
   dertien rijksoverheid-nieuwsberichten blijven FEITELIJKE_MEDEDELING,
   en die soort heeft bij BEVOEGD_GEZAG plafond 4 en mag zichzelf
   bevestigen. Terecht — een ministerie dat een benoeming meldt is de
   bron van dat feit.

   Maar niet elke zin in zo'n bericht gaat over eigen handelen. Gemeten
   op 31 oktober 2026 met rijksoverheid-nieuws (betrouwbaarheid 5,
   primaire bron):

     "De verplichte gegevensdeling voor netbeheerders geldt vanaf
      1 juli 2027."                      -> VASTGESTELD/0,80 -> DRAAGT
     "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro
      per maand."                        -> VASTGESTELD/0,80 -> DRAAGT

   Drie juridische vaststellingen bevestigden zichzelf uit een
   nieuwsbericht, zonder dat er ooit een authentieke juridische bron was
   gezien. De zes andere claims werden alleen tegengehouden door een
   modaliteitszekerheid van 0,35, en dat is geen bescherming om op te
   bouwen: één andere formulering en ze staan op 0,80.

   DE DRIE SOORTEN CLAIMS die de opdracht onderscheidt, en wat er met
   elk hoort te gebeuren:

     1 feitelijke mededeling over eigen activiteiten
         -> mag zichzelf bevestigen, ongewijzigd
     2 juridische claim over wetgeving of verplichtingen
         -> alleen uit een AUTHENTIEKE juridische bron
     3 numerieke claim
         -> bovendien de grootheidsmatch van bronverificatie.ts

   DE POORT ZIT OP DE VORM EN NIET OP DE SOORT. Dat is een correctie op
   mijn eerste opzet; zie het commentaar in uitspraken.ts. Een echt
   tariefbesluit kwam uit op FEITELIJKE_MEDEDELING omdat `geldt vanaf`
   niet in de smalle BESLUIT-patronen staat, en werd daarmee geblokkeerd
   voor zijn eigen claim — een kapotte keten, want dan kan
   bronverificatie nergens ankeren.
   ============================================================ */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { bepaalClaimAard, CLAIMAARD_VERSIE } from "../../src/pijplijn/claimaard.ts";
import {
  bepaalDocumentsoort,
  magZelfBevestigen,
  VASTSTELLENDE_SOORTEN,
  ALLEEN_BEVOEGD_GEZAG,
} from "../../src/pijplijn/documentsoort.ts";
import { vormKanVaststellen } from "../../src/pijplijn/documentvorm.ts";
import { extraheerUitspraken, schrijfUitspraken } from "../../src/pijplijn/uitspraken.ts";
import { bepaalModaliteit } from "../../src/pijplijn/claimmodaliteit.ts";
import { claimDraagt } from "../../src/pijplijn/claimpoort.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";

const NIEUWSKOP = "Nieuwsbericht 29-10-2026 | 10:14 ";
const NIEUWSURL = "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/afspraken";
const ROMP =
  " Het ministerie heeft de betrokken partijen hierover geinformeerd via de gebruikelijke kanalen.";
const BESLUITKOP = "Gelet op artikel 41 van de Elektriciteitswet 1998. ";
const BESLUITVOET = " Belanghebbenden kunnen binnen zes weken bezwaar maken tegen dit besluit.";

/** De drie gemeten zinnen plus varianten op dezelfde norm. */
const JURIDISCHE_ZINNEN = [
  "De verplichte gegevensdeling voor netbeheerders geldt vanaf 1 juli 2027.",
  "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand.",
  "Gemeenten zijn vanaf 1 juli 2027 verplicht om de verbruiksgegevens te delen.",
  "Vanaf 1 januari 2028 mogen leveranciers geen opslagkosten meer doorberekenen.",
  "Netbeheerders moeten een aansluiting binnen 18 weken realiseren.",
  "De regeling treedt in werking op 1 juli 2027.",
  "Huishoudens hebben recht op een vaste terugleververgoeding.",
  "Bij overtreding volgt een bestuurlijke boete van 50000 euro.",
];

/** Zinnen over EIGEN ACTIVITEITEN; die horen juist niet juridisch te zijn. */
const FEITELIJKE_ZINNEN = [
  "De ministerraad heeft ingestemd met de benoeming van prof. dr. Dirk Schoenmaker.",
  "De benoeming zal ingaan per 1 januari 2027.",
  "Het Dashboard Doorlooptijden Geneesmiddelen is vernieuwd.",
  "Het kabinet heeft in maart toegezegd zo'n 16% van de olievoorraad vrij te geven.",
  "Dat moet ervoor zorgen dat deze kinderen een goede start krijgen.",
  "Op 31 maart 2027 zal Rosita Steenbeek de tweede Loe de Jong-lezing uitspreken.",
  "Secretaris-generaal Van den Dungen verlaat het ministerie van Financien.",
];

/**
 * De hele keten voor één zin in één document, zoals uitspraken.ts hem
 * doorloopt: documentsoort -> mag dit document bevestigen -> is de
 * claim juridisch -> is er een authentieke grondslag -> draagt hij.
 */
function keten(
  titel: string,
  tekst: string,
  uitgeverSoort: string,
  bronSleutel: string,
  url?: string,
  betrouwbaarheid = 5,
) {
  const u = bepaalDocumentsoort({
    titel,
    tekst,
    uitgeverSoort,
    bronSleutel,
    ...(url === undefined ? {} : { url }),
  });
  const documentMag = betrouwbaarheid >= 4 && magZelfBevestigen(u.soort, u.gezag);
  const authentiek = u.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(u.vorm);
  return extraheerUitspraken(titel, tekst).map((c) => {
    const aard = bepaalClaimAard(c.tekst);
    const geblokkeerd = aard.juridisch && !authentiek;
    const status = documentMag && !geblokkeerd ? "bevestigd" : "ongeverifieerd";
    const mod = bepaalModaliteit({ tekst: c.tekst, documentsoort: u.soort });
    return {
      soort: u.soort,
      vorm: u.vorm,
      juridisch: aard.juridisch,
      geblokkeerd,
      status,
      zin: c.tekst,
      draagt: claimDraagt({
        verificatieStatus: status,
        modaliteit: mod.modaliteit,
        modaliteitZekerheid: mod.zekerheid,
        documentsoort: u.soort,
      }),
    };
  });
}

describe("de juridische claimpoort", () => {
  test("de versie staat vast", () => {
    assert.equal(CLAIMAARD_VERSIE, "claimaard-v1");
    /* VASTSTELLENDE_SOORTEN is uit ALLEEN_BEVOEGD_GEZAG gedefinieerd,
       zodat de twee lijsten niet uiteen kunnen lopen. */
    assert.deepEqual(VASTSTELLENDE_SOORTEN, ALLEEN_BEVOEGD_GEZAG);
  });

  /* ---------------- de aard van een zin ---------------- */

  test("elke juridische zin wordt als juridisch herkend", () => {
    for (const z of JURIDISCHE_ZINNEN) {
      const a = bepaalClaimAard(z);
      assert.equal(a.juridisch, true, `niet herkend: "${z}"`);
      assert.ok(a.markeringen.length > 0);
      assert.ok(a.reden.length > 20);
    }
  });

  test("geen enkele feitelijke mededeling over eigen handelen is juridisch", () => {
    /* DE TEGENPROEF, en zonder deze toets is de bovenstaande waardeloos:
       een predikaat dat ALLES juridisch noemt zou daar ook groen zijn,
       en zou de hele nieuwslaag van bevoegd gezag onbruikbaar maken. */
    for (const z of FEITELIJKE_ZINNEN) {
      const a = bepaalClaimAard(z);
      assert.equal(a.juridisch, false, `onterecht juridisch: "${z}" (${a.markeringen.join("; ")})`);
    }
  });

  /* ---------------- negatief: het nieuwsbericht ---------------- */

  test("NEGATIEF — geen juridische claim uit een nieuwsbericht draagt", () => {
    let gezien = 0;
    for (const z of JURIDISCHE_ZINNEN) {
      for (const r of keten(
        "Nieuwe afspraken voor netbeheerders",
        NIEUWSKOP + z + ROMP,
        "rijksoverheid",
        "rijksoverheid-nieuws",
        NIEUWSURL,
      )) {
        gezien += 1;
        assert.equal(r.juridisch, true, `"${r.zin}" werd niet juridisch bevonden`);
        assert.equal(r.geblokkeerd, true, `"${r.zin}" werd niet geblokkeerd`);
        assert.equal(r.status, "ongeverifieerd");
        assert.equal(r.draagt, false, `"${r.zin}" DRAAGT uit een nieuwsbericht`);
      }
    }
    assert.ok(gezien >= 5, `te weinig claims geëxtraheerd om iets te toetsen: ${gezien}`);
  });

  test("POSITIEF — dezelfde zin uit een authentieke bekendmaking draagt wel", () => {
    /* Zonder deze toets zou een poort die ALLES blokkeert ook groen
       staan — en dan was de keten kapot, want bronverificatie.ts kan
       dan nergens ankeren. */
    let dragend = 0;
    for (const z of JURIDISCHE_ZINNEN) {
      for (const r of keten(
        "Tariefbesluit 2027",
        BESLUITKOP + z + BESLUITVOET,
        "toezichthouder",
        "acm-besluiten",
      )) {
        assert.equal(r.vorm, "BEKENDMAKING");
        assert.equal(r.geblokkeerd, false, `"${r.zin}" werd geblokkeerd in een echt besluit`);
        if (r.draagt) dragend += 1;
      }
    }
    assert.ok(
      dragend > 0,
      "uit een authentieke bekendmaking hoort minstens één juridische claim te dragen",
    );
  });

  test("een FEITELIJKE claim uit een nieuwsbericht blijft ongemoeid", () => {
    /* De poort mag de bestaande route voor eigen activiteiten niet
       raken. Dit is de belangrijkste niet-regressietoets van deze
       correctie. */
    for (const z of FEITELIJKE_ZINNEN) {
      for (const r of keten(
        "Benoeming nieuwe voorzitter",
        NIEUWSKOP + z + ROMP,
        "rijksoverheid",
        "rijksoverheid-nieuws",
        NIEUWSURL,
      )) {
        assert.equal(r.juridisch, false, `"${r.zin}" werd juridisch bevonden`);
        assert.equal(r.geblokkeerd, false, `"${r.zin}" werd geblokkeerd`);
        assert.equal(r.status, "bevestigd", `"${r.zin}" werd niet bevestigd`);
      }
    }
  });

  /* ---------------- adversarieel ---------------- */

  test("ADVERSARIEEL — een niet-bevoegde uitgever komt er met geen enkele vorm", () => {
    /* De vorm is een extra eis bovenop het gezag. Een marktpartij die
       de aanhef en de rechtsmiddelenclausule nabootst haalt de VORM wel
       en bereikt daarmee niets. */
    for (const z of JURIDISCHE_ZINNEN) {
      for (const uitgever of [
        "branchevereniging",
        "vakmedium",
        "marktplatform",
        "netbeheerder",
        "statistiek",
        "onbekende-soort",
      ]) {
        for (const r of keten(
          "Tariefbesluit 2027",
          BESLUITKOP + z + BESLUITVOET,
          uitgever,
          "netbeheer-nederland-nieuws",
        )) {
          assert.equal(
            r.geblokkeerd,
            true,
            `${uitgever} mocht "${r.zin.slice(0, 50)}" bevestigen als ${r.soort}`,
          );
          assert.equal(r.draagt, false, `${uitgever} DRAAGT een juridische claim`);
        }
      }
    }
  });

  test("ADVERSARIEEL — een nieuwsbericht dat de wettekst woordelijk citeert draagt niet", () => {
    const citaat =
      NIEUWSKOP +
      "In de regeling staat letterlijk: 'Gelet op artikel 41 van de Elektriciteitswet " +
      "besluit de minister dat het maximumtarief vanaf 1 juli 2027 45 euro per maand " +
      "bedraagt.' Belanghebbenden kunnen binnen zes weken bezwaar maken." +
      ROMP;
    for (const r of keten(
      "Nieuwe tarieven bekendgemaakt",
      citaat,
      "rijksoverheid",
      "rijksoverheid-nieuws",
      NIEUWSURL,
    )) {
      assert.ok(
        !ALLEEN_BEVOEGD_GEZAG.includes(r.soort),
        `het citaat werd ${r.soort}`,
      );
      if (r.juridisch) {
        assert.equal(r.geblokkeerd, true, `"${r.zin.slice(0, 60)}" kwam erdoor`);
      }
      assert.equal(r.draagt, false);
    }
  });

  test("ADVERSARIEEL — een ontwerpbesluit draagt geen juridische claim", () => {
    for (const r of keten(
      "Ontwerpbesluit vaststelling nettarieven 2027",
      "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand. " +
        "U kunt uw zienswijze indienen tot 1 maart 2027.",
      "toezichthouder",
      "acm-besluiten",
    )) {
      assert.equal(r.vorm, "ONTWERP");
      assert.equal(r.soort, "ONTWERPBESLUIT");
      /* ALLEEN DE JURIDISCHE ZIN WORDT DOOR DEZE POORT GEBLOKKEERD. De
         andere zin in dit stuk ("U kunt uw zienswijze indienen") is
         geen juridische vaststelling, en die wordt tegengehouden door
         het PLAFOND van ONTWERPBESLUIT — 2, dus magZelfBevestigen is
         onwaar. Twee poorten, twee gronden; eisen dat de juridische
         poort beide pakt zou een onwaar beeld geven van wat hem
         tegenhoudt. */
      if (r.juridisch) assert.equal(r.geblokkeerd, true, `"${r.zin.slice(0, 50)}"`);
      assert.equal(r.draagt, false, `"${r.zin.slice(0, 50)}" draagt uit een ontwerp`);
    }
  });
});

/* ==================================================================
   END-TO-END — de databaserij, niet de voorspelling
   ------------------------------------------------------------------
   Alles hierboven rekent de keten na met dezelfde functies die
   uitspraken.ts gebruikt. Dat is nuttig maar niet genoeg: het bewijst
   niet dat `schrijfUitspraken()` de rij ook werkelijk op
   'ongeverifieerd' laat staan. Deze twee toetsen draaien tegen een
   echte database en lezen de kolom terug.
   ================================================================== */

describe("de juridische claimpoort in de database", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let bronId = 0;
  let documentId = 0;

  const JURIDISCHE_TEKST =
    "Het maximumtarief bedraagt vanaf 1 juli 2027 nog 45 euro per maand. " +
    "De verplichte gegevensdeling voor netbeheerders geldt vanaf 1 juli 2027.";

  before(async () => {
    db = await maakWegwerpdatabase("juridischepoort");
    org = await maakOrganisatie(db, "jp-org");
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const b = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            betrouwbaarheid, is_primaire_bron)
         values ($1,'rijksoverheid-nieuws','Rijksoverheid','sitemap',
                 'https://www.rijksoverheid.nl/sitemap.xml','https://www.rijksoverheid.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',5,true)
         returning id`,
        [org],
      );
      bronId = b.rows[0]!.id;
      const d = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            taal, gepubliceerd_op, datum_herkomst)
         values ($1,$2,'jp-1',$3,'Nieuwe afspraken voor netbeheerders','Rijksoverheid',
                 'sitemap','nl','2026-10-29T00:00:00Z','feed') returning id`,
        [org, bronId, NIEUWSURL],
      );
      documentId = d.rows[0]!.id;
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /** Eén versie en één gebeurtenis, en daarna de claims ervoor. */
  async function schrijf(vorm: "NIEUWSBERICHT" | "BEKENDMAKING", sleutel: string) {
    /* De opzet gaat als eigenaar, want een versie en een gebeurtenis
       aanmaken vraagt meer rechten dan de app-rol heeft. Het SCHRIJVEN
       van de claims gaat daarna juist WEL via de app-rol, want dat is
       de rol waarmee de pijplijn in productie draait — met RLS en met
       de rechten die daar gelden. */
    const opzet = await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
            tekst_lengte, wijziging_soort, injectie_verdacht)
         values ($1,$2,$3,$4,'Nieuwe afspraken voor netbeheerders',$5,$6,'nieuw',false)
         returning id`,
        [org, documentId, vorm === "NIEUWSBERICHT" ? 1 : 2, `hash-${sleutel}`,
         JURIDISCHE_TEKST, JURIDISCHE_TEKST.length],
      );
      const g = await c.query<{ id: number }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, gebeurd_op,
            risico_klasse, status)
         values ($1,$2,'Nieuwe afspraken','regelgeving','2026-10-29','laag','nieuw')
         returning id`,
        [org, sleutel],
      );
      return { versieId: v.rows[0]!.id, gebeurtenisId: g.rows[0]!.id };
    });

    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const rapport = await schrijfUitspraken(c, org, {
        gebeurtenisId: opzet.gebeurtenisId,
        versieId: opzet.versieId,
        titel: "Nieuwe afspraken voor netbeheerders",
        tekst: JURIDISCHE_TEKST,
        onderwerp: "netbeheer",
        risicoKlasse: "laag",
        isPrimaireBron: true,
        betrouwbaarheid: 5,
        documentsoort: "FEITELIJKE_MEDEDELING",
        gezag: "BEVOEGD_GEZAG",
        documentvorm: vorm,
        peildatum: "2026-10-29",
      });
      const rijen = await c.query<{ verificatie_status: string; tekst: string }>(
        `select u.verificatie_status, u.tekst
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
          where ub.versie_id = $1 order by u.id`,
        [opzet.versieId],
      );
      return { rapport, rijen: rijen.rows };
    });
  }

  test("NEGATIEF — uit vorm NIEUWSBERICHT blijft de rij ongeverifieerd", async () => {
    const { rapport, rijen } = await schrijf("NIEUWSBERICHT", "jp-nieuws");
    assert.ok(rapport.aangemaakt > 0, "er moeten claims zijn aangemaakt");
    assert.equal(rapport.bevestigd, 0, "geen enkele bevestiging");
    assert.equal(
      rapport.juridischGeblokkeerd,
      rapport.aangemaakt,
      "elke aangemaakte claim hoort geblokkeerd te zijn",
    );
    for (const r of rijen) {
      assert.equal(
        r.verificatie_status,
        "ongeverifieerd",
        `"${r.tekst.slice(0, 60)}" staat op ${r.verificatie_status}`,
      );
    }
  });

  test("POSITIEF — uit vorm BEKENDMAKING wordt dezelfde tekst wel bevestigd", async () => {
    /* Identieke tekst, identiek document, identieke uitgever. Alleen de
       VORM verschilt, en dat is precies wat de poort hoort te wegen. */
    const { rapport, rijen } = await schrijf("BEKENDMAKING", "jp-besluit");
    assert.ok(rapport.aangemaakt > 0);
    assert.equal(rapport.juridischGeblokkeerd, 0, "niets geblokkeerd bij een authentieke vorm");
    assert.equal(rapport.bevestigd, rapport.aangemaakt);
    for (const r of rijen) {
      assert.equal(r.verificatie_status, "bevestigd", `"${r.tekst.slice(0, 60)}"`);
    }
  });
});
