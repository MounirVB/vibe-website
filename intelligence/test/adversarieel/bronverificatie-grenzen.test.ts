/* ============================================================
   ADVERSARIEEL — de grenzen van de primaire-bronverificatie
   ------------------------------------------------------------
   DE AANNAME DIE HIER WORDT AANGEVALLEN. `verifieerBijGezag()` zegt
   TERUGGEVONDEN als het origineel van een nagevertelde claim bij het
   bevoegde gezag in onze eigen verzameling staat. Die uitslag zet
   `primaire_bron_bevestigd` op true, en dat veld reist mee naar het
   concept en naar het gepubliceerde record.

   Sectie 8 van de R3-acceptatieopdracht zegt het zo:

     "Een overeenkomst in bedrag en eenheid mag nooit zelfstandig
      bewijzen dat twee documenten hetzelfde besluit beschrijven."

   De eerste versie van deze laag koppelde op precies dat: waarde plus
   eenheid, met `order by u.id limit 1`. Een audit over acht scenario's
   vond 44 bevindingen. De acht scenario's uit de opdracht staan hier
   als toets, elk met een echte database eronder, zodat een latere
   versoepeling van de koppeling hier rood wordt.

   ELKE TOETS IS EEN VAL. Hij zet twee claims klaar die onder de oude
   regel aan elkaar geknoopt zouden worden, en eist dat de uitslag NIET
   TERUGGEVONDEN is. Een toets die groen wordt doordat de koppeling
   helemaal niets meer vindt, zou niets bewijzen; daarom staat er een
   positieve tegenproef bij die WEL TERUGGEVONDEN moet opleveren.
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
import {
  BRONVERIFICATIE_VERSIE,
  TIJDVENSTER_DAGEN,
  bronnenVanGezag,
  verifieerBijGezag,
} from "../../src/pijplijn/bronverificatie.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";

/** Het gezag waarvan we het origineel zoeken. */
const GEZAG = "ACM";
const GEZAGBRON = "acm-besluiten";
/** Een vakmedium dat het besluit navertelt. */
const NAVERTELBRON = "solar365";

type DocOpzet = {
  readonly extern: string;
  readonly bron: string;
  readonly titel: string;
  readonly datum: string;
  readonly documentsoort: string;
  readonly beschrijftBesluitVan: string | null;
};

type ClaimOpzet = {
  readonly waarde: number;
  readonly eenheid: string;
  readonly soort: string;
  readonly onderwerp: string;
  readonly toepassingsgebied: string | null;
  readonly status: string;
  readonly modaliteit: string;
  readonly zekerheid: number;
  readonly rol?: string;
};

describe("de grenzen van de primaire-bronverificatie", () => {
  let db: Wegwerpdatabase;
  let org: number;
  let bronIds: Map<string, number>;
  let teller = 0;

  before(async () => {
    db = await maakWegwerpdatabase("bronverificatie-grenzen");
    org = await maakOrganisatie(db, "vibe-energy");
    bronIds = new Map();

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      for (const [sleutel, uitgever] of [
        [GEZAGBRON, "ACM"],
        [NAVERTELBRON, "Solar365"],
      ] as const) {
        const r = await c.query<{ id: number }>(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              robots_status, tdm_status, verificatie_status, verificatie_bewijs,
              betrouwbaarheid, is_primaire_bron)
           values ($1,$2,$3,'rss','https://voorbeeld.test/feed','https://voorbeeld.test',true,
                   'toegestaan','geen_voorbehoud','geverifieerd','fixture',5,true)
           returning id`,
          [org, sleutel, uitgever],
        );
        bronIds.set(sleutel, r.rows[0]!.id);
      }
    });
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Zet een document plus één claim klaar en geef het claim-id terug. */
  async function zetKlaar(doc: DocOpzet, claim: ClaimOpzet): Promise<number> {
    teller += 1;
    return alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const d = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
            gepubliceerd_op)
         values ($1,$2,$3,$4,$5,'fixture','rss',$6::date)
         returning id`,
        [
          org,
          bronIds.get(doc.bron),
          doc.extern,
          `https://voorbeeld.test/${doc.extern}`,
          doc.titel,
          doc.datum,
        ],
      );
      const v = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie, beschrijft_besluit_van)
         values ($1,$2,1,$3,$4,'brontekst voor de fixture, lang genoeg om te bestaan',52,
                 $5,'BEVOEGD_GEZAG',$6,$7)
         returning id`,
        [
          org,
          d.rows[0]!.id,
          `hash-${doc.extern}`,
          doc.titel,
          doc.documentsoort,
          DOCUMENTSOORT_VERSIE,
          doc.beschrijftBesluitVan,
        ],
      );
      const u = await c.query<{ id: number }>(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
            toepassingsgebied, toepassingsgebied_grondslag, verificatie_status,
            bewijs_kwaliteit, modaliteit, modaliteit_zekerheid, modaliteit_versie)
         values ($1,$2,$3,$4,$5,$6,$7,$11,'ongeverifieerd',5,$8,$9,$10)
         returning id`,
        [
          org,
          `fixtureclaim ${teller}: ${claim.waarde} ${claim.eenheid} over ${claim.onderwerp}`,
          claim.soort,
          claim.waarde,
          claim.eenheid,
          claim.onderwerp,
          claim.toepassingsgebied,
          claim.modaliteit,
          claim.zekerheid,
          MODALITEIT_VERSIE,
          /* `uitspraken_gebied_heeft_grondslag` eist dat een vastgesteld
             toepassingsgebied zijn onderbouwing draagt — dezelfde regel
             als bij relevantie en materialiteit: een uitslag zonder
             uitleg is in dit systeem geen uitslag. */
          claim.toepassingsgebied === null ? null : "fixture: vastgesteld voor de grenstoets",
        ],
      );
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,$4)`,
        [org, u.rows[0]!.id, v.rows[0]!.id, claim.rol ?? "primair"],
      );
      /* Pas NA de bronbinding mag een claim bevestigd worden; de trigger
         uitspraken_bewijsplicht weigert dat anders. */
      if (claim.status !== "ongeverifieerd") {
        await c.query("update intel.uitspraken set verificatie_status = $2 where id = $1", [
          u.rows[0]!.id,
          claim.status,
        ]);
      }
      return u.rows[0]!.id;
    });
  }

  /** De standaardnavertelling: een vakmedium over een ACM-besluit. */
  function navertelling(extern: string, datum = "2026-06-01"): DocOpzet {
    return {
      extern,
      bron: NAVERTELBRON,
      titel: `Solar365 over een ACM-besluit (${extern})`,
      datum,
      documentsoort: "SECUNDAIRE_BERICHTGEVING",
      beschrijftBesluitVan: GEZAG,
    };
  }

  /** Een echt ACM-besluit. */
  function besluit(extern: string, datum = "2026-05-01"): DocOpzet {
    return {
      extern,
      bron: GEZAGBRON,
      titel: `ACM-besluit (${extern})`,
      datum,
      documentsoort: "OFFICIEEL_BESLUIT",
      beschrijftBesluitVan: null,
    };
  }

  /* ELKE TOETS KRIJGT ZIJN EIGEN WAARDE.
     Alle fixtures staan in één wegwerpdatabase, dus een besluit dat voor
     toets 0 is klaargezet wordt door toets 2 ook gevonden — met als
     gevolg dat die toets groen of rood wordt om de verkeerde reden. Een
     eigen `waarde` per scenario isoleert ze zonder een database per toets
     op te zetten. Dit was een fout in deze toets, niet in de koppeling:
     de eerste versie liet twaalf scenario's op elkaars fixture vallen. */
  const BASISCLAIM: ClaimOpzet = {
    waarde: 20,
    eenheid: "%",
    soort: "cijfer",
    onderwerp: "netbeheer",
    toepassingsgebied: "NEDERLAND",
    status: "bevestigd",
    modaliteit: "VASTGESTELD",
    zekerheid: 0.8,
  };

  async function verifieer(claimId: number, doc: DocOpzet, claim: ClaimOpzet) {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerBijGezag(c, org, {
        uitspraakId: claimId,
        beschrijftBesluitVan: doc.beschrijftBesluitVan,
        waarde: claim.waarde,
        eenheid: claim.eenheid,
        soort: claim.soort,
        onderwerp: claim.onderwerp,
        toepassingsgebied: claim.toepassingsgebied,
        brondatum: doc.datum,
      }),
    );
  }

  /* ---------- de tegenproef eerst ---------- */

  test("0 · TEGENPROEF — een echt origineel bij het gezag wordt WEL teruggevonden", async () => {
    /* Zonder deze toets zou elke toets hieronder groen worden door een
       koppeling die helemaal niets meer vindt. */
    await zetKlaar(besluit("p0-besluit"), BASISCLAIM);
    const doc = navertelling("p0-navertelling");
    const id = await zetKlaar(doc, { ...BASISCLAIM, status: "ongeverifieerd" });
    const v = await verifieer(id, doc, BASISCLAIM);
    assert.equal(v.uitslag, "TERUGGEVONDEN", v.toelichting);
    if (v.uitslag === "TERUGGEVONDEN") {
      assert.ok(v.bijUitspraakId > 0);
      assert.match(v.bijDocument, /ACM-besluit/);
    }
  });

  /* ---------- 1 · hetzelfde bedrag, ander besluit ---------- */

  test("1 · hetzelfde getal over een ANDER ONDERWERP is niet hetzelfde besluit", async () => {
    await zetKlaar(besluit("p1-besluit"), { ...BASISCLAIM, waarde: 31, onderwerp: "subsidie" });
    const doc = navertelling("p1-navertelling");
    const claim = { ...BASISCLAIM, waarde: 31, onderwerp: "netcongestie", status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("1b · hetzelfde getal met een ANDERE SOORT claim matcht niet", async () => {
    await zetKlaar(besluit("p1b-besluit"), { ...BASISCLAIM, waarde: 32, soort: "prijs", eenheid: "EUR" });
    const doc = navertelling("p1b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 32, soort: "cijfer", eenheid: "EUR", status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 2 · verschillende jaren ---------- */

  test("2 · hetzelfde bedrag uit een besluit van twee jaar eerder matcht niet", async () => {
    await zetKlaar(besluit("p2-besluit", "2024-01-15"), { ...BASISCLAIM, waarde: 33 });
    const doc = navertelling("p2-navertelling", "2026-06-01");
    const claim = { ...BASISCLAIM, waarde: 33, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
    assert.match(v.toelichting, new RegExp(String(TIJDVENSTER_DAGEN)));
  });

  test("2b · een besluit dat NA de navertelling is gepubliceerd kan het origineel niet zijn", async () => {
    await zetKlaar(besluit("p2b-besluit", "2026-09-01"), { ...BASISCLAIM, waarde: 34 });
    const doc = navertelling("p2b-navertelling", "2026-06-01");
    const claim = { ...BASISCLAIM, waarde: 34, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 3 · voorstel versus definitief besluit ---------- */

  test("3 · een VOORSTEL bij het gezag bevestigt geen nagevertelde vaststelling", async () => {
    await zetKlaar(besluit("p3-besluit"), { ...BASISCLAIM, waarde: 35, modaliteit: "VOORSTEL" });
    const doc = navertelling("p3-navertelling");
    const claim = { ...BASISCLAIM, waarde: 35, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("3b · een vaststelling met te lage zekerheid bevestigt niets", async () => {
    await zetKlaar(besluit("p3b-besluit"), { ...BASISCLAIM, waarde: 36, zekerheid: 0.35 });
    const doc = navertelling("p3b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 36, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 4 · branchevereniging versus bevoegde instantie ---------- */

  test("4 · een document dat ZELF een navertelling is, is geen origineel", async () => {
    /* Een stuk op acm.nl dat een besluit van de minister navertelt, is
       geen origineel van een ACM-besluit. */
    await zetKlaar(
      {
        ...besluit("p4-besluit"),
        documentsoort: "SECUNDAIRE_BERICHTGEVING",
        beschrijftBesluitVan: "de minister",
      },
      { ...BASISCLAIM, waarde: 43 },
    );
    const doc = navertelling("p4-navertelling");
    const claim = { ...BASISCLAIM, waarde: 43, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("4b · een PERSBERICHT bij het gezag is geen origineel", async () => {
    await zetKlaar({ ...besluit("p4b-besluit"), documentsoort: "PERSBERICHT" }, { ...BASISCLAIM, waarde: 44 });
    const doc = navertelling("p4b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 44, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 5 · regionaal versus landelijk ---------- */

  test("5 · een getal met een ANDER rechtsgebied matcht niet", async () => {
    await zetKlaar(besluit("p5-besluit"), { ...BASISCLAIM, waarde: 38, toepassingsgebied: "BELGIE" });
    const doc = navertelling("p5-navertelling");
    const claim = { ...BASISCLAIM, waarde: 38, toepassingsgebied: "NEDERLAND", status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("5b · een ONBEKEND rechtsgebied is verenigbaar en blokkeert niet", async () => {
    /* Verenigbaarheid en geen gelijkheid: `toepassingsgebied` is op 36
       van de 59 productieclaims gevuld, dus een harde gelijkheidseis zou
       de koppeling vaker weigeren om een leeg veld dan om een echt
       verschil. ONBEKEND is een echte uitslag in dit schema. */
    await zetKlaar(besluit("p5b-besluit"), { ...BASISCLAIM, waarde: 39, toepassingsgebied: "ONBEKEND" });
    const doc = navertelling("p5b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 39, toepassingsgebied: "NEDERLAND", status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 6 · vervallen of vervangen besluit ---------- */

  test("6 · een INGETROKKEN claim bij het gezag is geen origineel", async () => {
    await zetKlaar(besluit("p6-besluit"), { ...BASISCLAIM, waarde: 40, status: "ingetrokken" });
    const doc = navertelling("p6-navertelling");
    const claim = { ...BASISCLAIM, waarde: 40, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("6b · een TEGENGESPROKEN claim bij het gezag is geen origineel", async () => {
    await zetKlaar(besluit("p6b-besluit"), { ...BASISCLAIM, waarde: 41, status: "tegengesproken" });
    const doc = navertelling("p6b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 41, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  test("6c · een VERLOPEN claim bij het gezag is geen origineel", async () => {
    await zetKlaar(besluit("p6c-besluit"), { ...BASISCLAIM, waarde: 42, status: "verlopen" });
    const doc = navertelling("p6c-navertelling");
    const claim = { ...BASISCLAIM, waarde: 42, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- 7 · tegenstrijdige publicaties ---------- */

  test("7 · TWEE passende besluiten leveren AMBIGU en geen willekeurige keuze", async () => {
    /* Dit is de kern van de reparatie. De oude koppeling nam
       `order by u.id limit 1` en dus de OUDSTE rij — bij een vervangen
       besluit systematisch de vervallen variant. Er valt hier niets te
       kiezen. */
    await zetKlaar(besluit("p7-besluit-a", "2026-03-01"), { ...BASISCLAIM, waarde: 45 });
    await zetKlaar(besluit("p7-besluit-b", "2026-04-01"), { ...BASISCLAIM, waarde: 45 });
    const doc = navertelling("p7-navertelling");
    const claim = { ...BASISCLAIM, waarde: 45, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "AMBIGU", v.toelichting);
    if (v.uitslag === "AMBIGU") {
      assert.ok(v.kandidaten >= 2, `kandidaten ${v.kandidaten}`);
      assert.match(v.toelichting, /niet vast te stellen/);
    }
    /* En de grondslag noemt ze allemaal, zodat een mens kan kijken. */
    const kandidaten = (v.grondslag as { kandidaten?: unknown[] }).kandidaten ?? [];
    assert.ok(kandidaten.length >= 2, "de grondslag hoort alle kandidaten te noemen");
  });

  /* ---------- 8 · onvolledige bronvermelding ---------- */

  test("8 · zonder ONDERWERP is er geen grootheidsanker en dus geen verificatie", async () => {
    await zetKlaar(besluit("p8-besluit"), { ...BASISCLAIM, waarde: 46 });
    const doc = navertelling("p8-navertelling");
    const claim = { ...BASISCLAIM, waarde: 46, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerBijGezag(c, org, {
        uitspraakId: id,
        beschrijftBesluitVan: GEZAG,
        waarde: claim.waarde,
        eenheid: claim.eenheid,
        soort: claim.soort,
        onderwerp: null,
        toepassingsgebied: claim.toepassingsgebied,
        brondatum: doc.datum,
      }),
    );
    assert.equal(v.uitslag, "NIET_VAN_TOEPASSING", v.toelichting);
    assert.match(v.toelichting, /grootheidsanker/);
  });

  test("8b · zonder DATUM is er geen tijdvenster en dus geen verificatie", async () => {
    const doc = navertelling("p8b-navertelling");
    const claim = { ...BASISCLAIM, waarde: 47, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerBijGezag(c, org, {
        uitspraakId: id,
        beschrijftBesluitVan: GEZAG,
        waarde: claim.waarde,
        eenheid: claim.eenheid,
        soort: claim.soort,
        onderwerp: claim.onderwerp,
        toepassingsgebied: claim.toepassingsgebied,
        brondatum: null,
      }),
    );
    assert.equal(v.uitslag, "NIET_VAN_TOEPASSING", v.toelichting);
    assert.match(v.toelichting, /tijdvenster/);
  });

  test("8c · zonder getal met eenheid is een woordovereenkomst geen verificatie", async () => {
    const doc = navertelling("p8c-navertelling");
    const claim = { ...BASISCLAIM, waarde: 48, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      verifieerBijGezag(c, org, {
        uitspraakId: id,
        beschrijftBesluitVan: GEZAG,
        waarde: null,
        eenheid: null,
        soort: claim.soort,
        onderwerp: claim.onderwerp,
        toepassingsgebied: claim.toepassingsgebied,
        brondatum: doc.datum,
      }),
    );
    assert.equal(v.uitslag, "NIET_VAN_TOEPASSING", v.toelichting);
    assert.match(v.toelichting, /woordovereenkomst/);
  });

  /* ---------- de rol van de binding ---------- */

  test("9 · een TEGENSPREKENDE binding aan het gezagsdocument is geen origineel", async () => {
    /* intel.uitspraak_bronnen.rol kan 'tegensprekend' zijn: de
       vastgelegde administratie dat dát document deze claim WEERSPREEKT.
       Zonder rolfilter gold die binding als bewijs.

       DE OPZET IS HIER OMSLACHTIG, EN DAT MOET. Een claim kan niet
       'bevestigd' worden zonder een PRIMAIRE bronbinding — de trigger
       uitspraken_bewijsplicht weigert dat, en terecht. De eerste versie
       van deze toets gaf de gezagclaim alleen een tegensprekende
       binding; die viel dus om op de trigger en toetste niets.

       Nu krijgt de claim bij het gezag een PRIMAIRE binding aan een
       PERSBERICHT (zodat hij bevestigd mag worden) en daarnaast een
       TEGENSPREKENDE binding aan het echte besluit. Onder de oude
       koppeling — join zonder rolfilter — zou de tegensprekende binding
       aan het besluit hem alsnog tot origineel maken. Nu loopt de match
       langs de primaire binding, en die wijst naar een persbericht, dat
       geen besluit is. Twee voorwaarden die samen werken. */
    const gezagClaimId = await zetKlaar(
      { ...besluit("p9-persbericht"), documentsoort: "PERSBERICHT" },
      { ...BASISCLAIM, waarde: 49 },
    );
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      const besluitDoc = await c.query<{ id: number }>(
        `insert into intel.brondocumenten
           (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
         values ($1,$2,'p9-besluit','https://voorbeeld.test/p9-besluit','ACM-besluit (p9)','fixture','rss','2026-05-01'::date)
         returning id`,
        [org, bronIds.get(GEZAGBRON)],
      );
      const bv = await c.query<{ id: number }>(
        `insert into intel.brondocument_versies
           (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte,
            documentsoort, documentsoort_gezag, documentsoort_versie)
         values ($1,$2,1,'hash-p9-besluit','ACM-besluit (p9)','brontekst lang genoeg om te bestaan',40,
                 'OFFICIEEL_BESLUIT','BEVOEGD_GEZAG',$3)
         returning id`,
        [org, besluitDoc.rows[0]!.id, DOCUMENTSOORT_VERSIE],
      );
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
         values ($1,$2,$3,'tegensprekend')`,
        [org, gezagClaimId, bv.rows[0]!.id],
      );
    });

    const doc = navertelling("p9-navertelling");
    const claim = { ...BASISCLAIM, waarde: 49, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    assert.equal(v.uitslag, "NIET_TERUGGEVONDEN", v.toelichting);
  });

  /* ---------- de kaart en de versie ---------- */

  test("10 · de gezagkaart is afgeleid en bevat de regionale bekendmakingsbron", async () => {
    /* De oude kaart was met de hand bijgehouden en miste
       `koop-gemeenteblad-vergunningen`, juist de bron met de regionale
       bekendmakingen. Hij wordt nu afgeleid uit EIGEN_GEZAG_NAMEN. */
    const acm = bronnenVanGezag("ACM");
    assert.deepEqual([...acm], [GEZAGBRON]);
    const minister = bronnenVanGezag("de minister");
    assert.ok(minister.length >= 2, `bronnen voor 'de minister': ${minister.join(", ")}`);
    assert.ok(
      minister.includes("koop-gemeenteblad-vergunningen"),
      `de regionale bekendmakingsbron hoort erbij: ${minister.join(", ")}`,
    );
    assert.deepEqual([...bronnenVanGezag("de Europese Commissie")], []);
  });

  test("11 · de uitslag draagt altijd een grondslag met de motorversie", async () => {
    const doc = navertelling("p11-navertelling");
    const claim = { ...BASISCLAIM, waarde: 50, status: "ongeverifieerd" };
    const id = await zetKlaar(doc, claim);
    const v = await verifieer(id, doc, claim);
    const g = v.grondslag as Record<string, unknown>;
    assert.equal(g["versie"], BRONVERIFICATIE_VERSIE);
    assert.equal(g["gezag"], GEZAG);
    assert.ok(v.toelichting.length > 20);
  });
});
