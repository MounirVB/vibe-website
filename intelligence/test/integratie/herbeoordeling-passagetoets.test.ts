/* ============================================================
   INTEGRATIE — de herbeoordeling past de passagetoets toe
   ------------------------------------------------------------
   WAAROM DEZE TOETS BESTAAT.

   Op 6 november 2026 stonden in productie zes claims uit het
   ACM-geschilbesluit ACM/UIT/1123013 op 'bevestigd' met bewijsniveau
   DIRECT_BEVESTIGD. Vier ervan komen uit de sectie 'Standpunten van
   partijen' — het standpunt van een supermarkt stond dus als
   vaststelling van de toezichthouder in de database, op het hoogste
   bewijsniveau dat dit systeem kent.

   De passagetoets in schrijfUitspraken() ving dat voor NIEUWE claims,
   maar geen enkele bestaande taak kon de zes corrigeren:
   herbeoordeelClaim() kreeg de documenttekst niet als invoer en kon de
   toets dus niet stellen. magZelfBevestigen() kijkt alleen naar de
   SOORT en het GEZAG van het stuk, en een ACM-besluit haalt beide.

   DE DATA IS DE ECHTE DATA. test/data/acm-uit-1123013.json bevat de
   woordelijke ruwe_tekst van intel.brondocument_versies id 4394 uit
   productie (24.054 tekens, inclusief de OCR-artefacten) en de zes
   claimteksten met hun productiestand. Een nabouw van die tekst zou
   zijn eigen nabouw meten — dezelfde klasse fout die deze repo bij de
   PDF-opname en bij de paragraafkop al heeft betaald.

   WAT ER GEMETEN WORDT, per eis uit de opdracht:

     officieel besluit met eigen vaststelling  -> blijft bevestigd
     officieel besluit met partijstandpunt     -> ingetrokken
     achtergrondpassage                        -> ingetrokken
     niet-vaststellende modaliteit             -> ingetrokken
     ontbrekende documenttekst                 -> GEEN intrekking
     ontbrekende bronpassage                   -> GEEN intrekking
     dubbele herbeoordeling                    -> tweede ronde ziet 0
     de zes concrete claims                    -> alle zes nagemeten
     auditregistratie                          -> voor- en nawaarde
     publicatiebeveiligingen                   -> onaangeroerd

   DE TWEE 'GEEN INTREKKING'-ZAKEN ZIJN GEEN SLORDIGHEID MAAR DE
   AFSPRAAK. steltStukDeClaimVast() is eenzijdig: hij blokkeert alleen
   bij POSITIEF bewijs dat de zin buiten het vaststellende deel staat.
   Ontbreekt de tekst, of is de claimzin er niet in te vinden, dan is er
   geen bewijs van achtergrond — en een herbeoordeling die op afwezig
   bewijs intrekt, sloopt bij elke mislukte tekstextractie
   bevestigingen. Die keuze staat hier als toets en niet als aanname.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";

import {
  alsEigenaar,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  HERBEOORDELING_HANDELING,
  herbeoordeelClaim,
  herbeoordeelClaims,
} from "../../src/pijplijn/herbeoordeling.ts";
import { DOCUMENTSOORT_VERSIE } from "../../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../../src/pijplijn/claimmodaliteit.ts";
import { MOTORVERSIES } from "../../src/pijplijn/motorversies.ts";
import { REGISTER } from "../../src/kern/taken.ts";

/* ------------------------------------------------------------------
   DE PRODUCTIEFIXTURE
   ------------------------------------------------------------------ */
type Fixture = {
  readonly herkomst: string;
  readonly titel: string;
  readonly documentsoort: string;
  readonly documentvorm: string;
  readonly gezag: string;
  readonly tekstLengte: number;
  readonly ruweTekst: string;
  readonly productiestand: readonly {
    readonly id: number;
    readonly tekst: string;
    readonly verificatieStatus: string;
    readonly bewijsniveau: string | null;
  }[];
};

const BESLUIT = JSON.parse(
  readFileSync(new URL("../data/acm-uit-1123013.json", import.meta.url), "utf8"),
) as Fixture;

/** Een zin die GEMETEN in sectie 6 'Beoordeling van het geschil' staat. */
const EIGEN_VASTSTELLING = "De ACM stelt vast dat de klacht van Jumbo gegrond is.";

/* De oude stempel: precies wat de zes claims in productie droegen
   (gemeten op 6 november 2026). Zonder vaststelling-v1 erin, want dat
   is exact de toevoeging die hen opnieuw laat wegen. */
const OUDE_STEMPEL =
  "documentsoort-v2 + claimmodaliteit-v2 + claimvorm-v1 + datumrol-v1";

type ClaimSpec = {
  readonly label: string;
  readonly tekst: string;
  readonly soort: string;
  readonly claimvorm: string | null;
  readonly tijdstand: string | null;
  readonly verwoordbaar: string;
  readonly bewijsniveau: string | null;
  readonly versie: "besluit" | "leeg" | "nieuwsbericht";
};

describe("de herbeoordeling past de passagetoets toe", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  const id: Record<string, number> = {};

  before(async () => {
    db = await maakWegwerpdatabase("herbpassage");
    org = await maakOrganisatie(db, "herbpassage-org");

    assert.equal(
      BESLUIT.tekstLengte,
      BESLUIT.ruweTekst.length,
      "de fixture moet de lengte dragen die hij beweert",
    );
    assert.ok(
      BESLUIT.ruweTekst.includes(EIGEN_VASTSTELLING),
      "de positieve zaak moet woordelijk in de productietekst staan",
    );

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam, risico_klasse)
         values ($1,'netcongestie','Netcongestie','hoog'),
                ($1,'subsidie','Subsidie','hoog')`,
        [org],
      );

      /* ---- BRON 1: het ACM-besluit, bevoegd gezag in een
             vaststellende vorm. Dit is het stuk waarop de zes claims
             hangen. ---- */
      const bronAcm = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'acm-besluiten','Autoriteit Consument & Markt','html_lijst',
                 'https://www.acm.nl/nl/publicaties','https://www.acm.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['netcongestie'],true)
         returning id`,
        [org],
      );
      /* ---- BRON 2: RVO, bevoegd gezag maar een NIEUWSBERICHT. Dit is
             de bron van de gerectificeerde claims 3 en 4 in productie
             (gemeten: rvo-opendata-artikelen, FEITELIJKE_MEDEDELING /
             NIEUWSBERICHT / BEVOEGD_GEZAG). Hij staat hier om te
             bewijzen dat de reparatie HEN niet raakt. ---- */
      const bronRvo = await c.query<{ id: number }>(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            robots_status, tdm_status, verificatie_status, verificatie_bewijs,
            is_primaire_bron, betrouwbaarheid, levert_gebeurtenissen, onderwerpen, mag_citeren)
         values ($1,'rvo-opendata-artikelen','Rijksdienst voor Ondernemend Nederland','json_api',
                 'https://opendata.rvo.nl/api','https://www.rvo.nl',
                 true,'toegestaan','geen_voorbehoud','geverifieerd','fixture',
                 true,5,true,array['subsidie'],true)
         returning id`,
        [org],
      );

      const maakVersie = async (
        bronId: number,
        externId: string,
        titel: string,
        tekst: string,
        soort: string,
        gezag: string,
        vorm: string,
      ): Promise<number> => {
        const doc = await c.query<{ id: number }>(
          `insert into intel.brondocumenten
             (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
              gepubliceerd_op)
           values ($1,$2,$3,'https://www.acm.nl/documents/' || $3,$4,'fixture','dataset',
                   now() - interval '3 days')
           returning id`,
          [org, bronId, externId, titel],
        );
        const v = await c.query<{ id: number }>(
          `insert into intel.brondocument_versies
             (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
              tekst_lengte, documentsoort, documentsoort_gezag, documentsoort_versie,
              documentvorm)
           values ($1,$2,1,'hash-' || $3,$4,$5, length($5),$6,$7,$8,$9)
           returning id`,
          [org, doc.rows[0]!.id, externId, titel, tekst, soort, gezag, DOCUMENTSOORT_VERSIE, vorm],
        );
        return v.rows[0]!.id;
      };

      const versies: Record<string, number> = {
        besluit: await maakVersie(
          bronAcm.rows[0]!.id,
          "acm-uit-1123013",
          BESLUIT.titel,
          BESLUIT.ruweTekst,
          BESLUIT.documentsoort,
          BESLUIT.gezag,
          BESLUIT.documentvorm,
        ),
        /* ONTBREKENDE DOCUMENTTEKST. Eén leesteken, want tekst_lengte
           en de inhoudshash willen een waarde; de passagetoets heeft
           aan één teken net zo weinig als aan nul. */
        leeg: await maakVersie(
          bronAcm.rows[0]!.id,
          "acm-zonder-tekst",
          "Besluit waarvan de tekstlaag niet is gelukt",
          " ",
          BESLUIT.documentsoort,
          BESLUIT.gezag,
          BESLUIT.documentvorm,
        ),
        nieuwsbericht: await maakVersie(
          bronRvo.rows[0]!.id,
          "rvo-milieu-2025",
          "Bedrijven investeerden in 2025 ruim 3 miljard euro in milieumaatregelen",
          "Bedrijven maakten in 2025 voor ruim 3 miljard euro aan milieu-investeringen. " +
            "De Rijksdienst voor Ondernemend Nederland publiceert deze cijfers jaarlijks.",
          "FEITELIJKE_MEDEDELING",
          "BEVOEGD_GEZAG",
          "NIEUWSBERICHT",
        ),
      };

      /* ---- DE CLAIMS ------------------------------------------------
         De zes dragen hun WOORDELIJKE productietekst en hun gemeten
         kolomwaarden (soort, claimvorm, tijdstand, verwoordbaar,
         bewijsniveau). De overige zijn de gevallen die de zes niet
         dekken. ---- */
      const zes = new Map(BESLUIT.productiestand.map((p) => [p.id, p.tekst]));
      const specs: ClaimSpec[] = [
        /* --- de zes echte, met hun productiewaarden --- */
        { label: "p137", tekst: zes.get(137)!, soort: "status", claimvorm: "CONGESTIESTATUS",
          tijdstand: "ONBEPAALD", verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },
        { label: "p138", tekst: zes.get(138)!, soort: "datum", claimvorm: null,
          tijdstand: null, verwoordbaar: "VERIFICATIE_NODIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },
        { label: "p139", tekst: zes.get(139)!, soort: "datum", claimvorm: null,
          tijdstand: null, verwoordbaar: "VERIFICATIE_NODIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },
        { label: "p140", tekst: zes.get(140)!, soort: "status", claimvorm: "CONGESTIESTATUS",
          tijdstand: "ONBEPAALD", verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },
        { label: "p141", tekst: zes.get(141)!, soort: "status", claimvorm: "CONGESTIESTATUS",
          tijdstand: "ONBEPAALD", verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },
        { label: "p161", tekst: zes.get(161)!, soort: "status", claimvorm: "CONGESTIESTATUS",
          tijdstand: "TIJDELIJK", verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },

        /* --- EIGEN VASTSTELLING: moet blijven staan. Zonder deze zaak
               zou een reparatie die ALLES intrekt ook groen staan, en
               dan meet dit bestand niets. --- */
        { label: "dictum", tekst: EIGEN_VASTSTELLING, soort: "status",
          claimvorm: null, tijdstand: null, verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "besluit" },

        /* --- ONTBREKENDE BRONPASSAGE: de zin staat NIET in het
               document. steltStukDeClaimVast() kan hem niet
               localiseren, dus er is geen bewijs van achtergrond. --- */
        { label: "nietInStuk",
          tekst: "Het gecontracteerde transportvermogen van deze aansluiting is verdubbeld in 2027.",
          soort: "status", claimvorm: null, tijdstand: null,
          verwoordbaar: "CONTEXT_ONVOLLEDIG", bewijsniveau: "DIRECT_BEVESTIGD",
          versie: "besluit" },

        /* --- ONTBREKENDE DOCUMENTTEKST --- */
        { label: "zonderTekst", tekst: EIGEN_VASTSTELLING, soort: "status",
          claimvorm: null, tijdstand: null, verwoordbaar: "CONTEXT_ONVOLLEDIG",
          bewijsniveau: "DIRECT_BEVESTIGD", versie: "leeg" },

        /* --- EEN VERWOORDBARE STANDPUNTCLAIM. De zes staan allemaal op
               CONTEXT_ONVOLLEDIG of VERIFICATIE_NODIG, dus zonder deze
               zaak wordt de verwoordbaarheidsregel nooit geraakt. --- */
        /* Dezelfde zin als p140, met opzet: dan dragen beide dezelfde
           claim_afdruk en telt de bewijsniveaustap ze als één bewering.
           Dat is precies de vorm die in productie voorkomt. */
        { label: "verwoordbaar", tekst: zes.get(140)!,
          soort: "prijs", claimvorm: null, tijdstand: null,
          verwoordbaar: "VERWOORDBAAR", bewijsniveau: "DIRECT_BEVESTIGD",
          versie: "besluit" },

        /* --- EEN JURIDISCHE CLAIM OP EEN NIEUWSBERICHT. Woordelijk
               productieclaim 79, bron rijksoverheid-nieuws, titel
               "Kabinet legt stikstofaanpak vast en zet steun voor
               boeren klaar": FEITELIJKE_MEDEDELING / NIEUWSBERICHT /
               BEVOEGD_GEZAG, bevestigd met DIRECT_BEVESTIGD.

               DEZE CLAIM STOND NIET IN DE OPDRACHT, en hij is ook niet
               het gevolg van de poortwijziging: 'gaat ... in' is een
               inwerkingtreding, dus bepaalClaimAard() merkt hem als
               juridisch en de BESTAANDE poort wijst hem al af
               (gemeten: uitslag GEEN_AUTHENTIEK_STUK, zowel met de
               oude als met de nieuwe grond). Hij staat bevestigd in
               productie omdat hij is weggeschreven vóórdat die poort
               bestond — en de herbeoordeling is wat hem nu opruimt.
               Dat is precies het gat dat deze ronde moest dichten, dus
               hij hoort hier als zaak. --- */
        { label: "p79",
          tekst: "Per 1 juli 2027 gaat de rekenkundige ondergrens in, als aan de voorwaarden is voldaan.",
          soort: "datum", claimvorm: null, tijdstand: null,
          verwoordbaar: "CONTEXT_ONVOLLEDIG", bewijsniveau: "DIRECT_BEVESTIGD",
          versie: "nieuwsbericht" },

        /* --- DE GERECTIFICEERDE PAAR, model van productieclaims 3 en 4.
               Bevoegd gezag, maar een NIEUWSBERICHT: vormKanVaststellen()
               geeft daar onwaar, dus de passagetoets hoort hen niet te
               raken. --- */
        { label: "rect-oud",
          tekst: "In 2025 ruim 3 miljard euro aan milieu-investeringen door bedrijven.",
          soort: "prijs", claimvorm: null, tijdstand: null,
          verwoordbaar: "VERIFICATIE_NODIG", bewijsniveau: null,
          versie: "nieuwsbericht" },
        { label: "rect-nieuw",
          tekst: "Bedrijven maakten in 2025 voor ruim 3 miljard euro aan milieu-investeringen.",
          soort: "prijs", claimvorm: null, tijdstand: null,
          verwoordbaar: "VERIFICATIE_NODIG", bewijsniveau: null,
          versie: "nieuwsbericht" },
      ];

      for (const s of specs) {
        /* EERST ONGEVERIFIEERD, DAN DE BRON, DAN DE STATUS. De trigger
           uitspraken_bewijsplicht is DEFERRABLE en eist bij het
           afsluiten van de transactie dat een bevestigde claim een
           primaire bronversie heeft. */
        const r = await c.query<{ id: number }>(
          `insert into intel.uitspraken
             (organisatie_id, tekst, soort, onderwerp, risico_klasse,
              verificatie_status, bewijs_kwaliteit, bewijskracht_plafond,
              modaliteit, modaliteit_zekerheid, modaliteit_versie,
              claimvorm, tijdstand, bronpassage,
              verwoordbaar, verwoordbaar_reden, verwoordbaar_op,
              /* EEN VERWOORDBARE CLAIM MOET EEN ZIN EN EEN GEBIED HEBBEN.
                 uitspraken_verwoordbaar_heeft_zin (0025) eist een zin van
                 25 tekens, uitspraken_verwoordbaar_vraagt_gebied (0038)
                 eist NEDERLAND of EU. Mijn eerste fixture liet beide weg
                 en kreeg woordelijk:
                   new row for relation "uitspraken" violates check
                   constraint "uitspraken_verwoordbaar_heeft_zin"
                 Dat zijn de bestaande grendels, en ze werken. */
              verwoorde_zin, toepassingsgebied, toepassingsgebied_grondslag,
              bewijsniveau, bewijsniveau_reden, bewijsniveau_op,
              herbeoordeeld_onder)
           values ($1,$2,$3,$4,'hoog','ongeverifieerd',5,5,
                   'VASTGESTELD',0.80,$5,
                   $6::text,$7::text,
                   case when $6::text is null then null else
                     'passage uit de fixture, minstens tien tekens lang' end,
                   $8,'vastgelegd door de fixture van deze toets',now(),
                   case when $8 = 'VERWOORDBAAR'
                     then 'Het transportvermogen in dit congestiegebied is begrensd.'
                     else null end,
                   case when $8 = 'VERWOORDBAAR' then 'NEDERLAND' else null end,
                   /* uitspraken_gebied_heeft_grondslag (0038) eist een
                      grondslag van 15 tekens zodra er een gebied staat. */
                   case when $8 = 'VERWOORDBAAR'
                     then 'uitgeversregel: de ACM is een Nederlandse toezichthouder'
                     else null end,
                   $9::text, case when $9::text is null then null else
                     'bron acm-besluiten noemt dit feit in zijn eigen publicatie' end,
                   case when $9::text is null then null else now() end,
                   $10)
           returning id`,
          [
            org, s.tekst, s.soort,
            s.versie === "nieuwsbericht" ? "subsidie" : "netcongestie",
            MODALITEIT_VERSIE, s.claimvorm, s.tijdstand, s.verwoordbaar,
            s.bewijsniveau, OUDE_STEMPEL,
          ],
        );
        id[s.label] = r.rows[0]!.id;
        await c.query(
          `insert into intel.uitspraak_bronnen
             (organisatie_id, uitspraak_id, versie_id, rol, vindplaats)
           values ($1,$2,$3,'primair','fixture')`,
          [org, r.rows[0]!.id, versies[s.versie]!],
        );
        await c.query(
          `update intel.uitspraken set verificatie_status = 'bevestigd'
            where organisatie_id = $1 and id = $2`,
          [org, r.rows[0]!.id],
        );
      }

      /* DE CORRECTIEKETEN voor het gerectificeerde paar. */
      await c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1,$2,$3,'rectificatie',
                 'Schaalcorrectie: de brontekst zet miljard direct naast het getal.')`,
        [org, id["rect-oud"]!, id["rect-nieuw"]!],
      );
    });
  });

  after(async () => {
    await db.opruimen();
  });

  /* ================================================================
     DE RONDE ZELF
     ================================================================ */
  let ronde: Awaited<ReturnType<typeof herbeoordeelClaims>>;

  test("1 · de ronde selecteert elke claim, want de motorstempel is veranderd", async () => {
    assert.ok(
      MOTORVERSIES.includes("vaststelling-"),
      "vaststelling hoort in de stempel, anders ziet de herbeoordeling de zes niet",
    );
    assert.notEqual(MOTORVERSIES, OUDE_STEMPEL, "de stempel moet verschillen van de productiestand");

    const droog = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, { droog: true }),
    );
    assert.equal(droog.bekeken, 13, "dertien claims in de fixture");
    assert.equal(droog.droog, true);

    /* Een droge ronde schrijft niets: de zes staan er na deze aanroep
       nog precies zo. Zonder deze controle zou de echte ronde
       hieronder niet te scheiden zijn van de droge. */
    const naDroog = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where organisatie_id = $1 and verificatie_status = 'bevestigd'`,
        [org],
      );
      return r.rows[0]!.n;
    });
    assert.equal(naDroog, 13, "de droge ronde heeft niets ingetrokken");

    ronde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(ronde.bekeken, 13);
    assert.equal(ronde.herbeoordeeld, 13);
  });

  test("2 · de passagetoets trekt precies de acht onhoudbare bevestigingen in", async () => {
    /* ZES UIT HET BESLUIT + de verwoordbare standpuntclaim die op
       dezelfde zin rust. De drie die moeten blijven zijn: het dictum,
       de niet-localiseerbare zin en de claim zonder documenttekst. Plus
       de twee RVO-claims, die niet eens langs de toets gaan. */
    assert.equal(ronde.passageIngetrokken, 8, JSON.stringify(ronde.perPassageUitslag));
    assert.equal(
      ronde.bevestigingIngetrokken,
      8,
      "en elke passage-intrekking is ook een intrekking van de bevestiging",
    );
  });

  test("3 · met de gronden erbij: achtergrondpassage én modaliteit", () => {
    /* DE UITSLAG MOET ONDERSCHEIDEN. Een blokkade op 'achtergrond'
       vraagt een ander menselijk oordeel dan een blokkade op
       'verwachting', en zonder dit onderscheid is de ronde niet na te
       meten. Gemeten op de echte tekst: 138-141 staan in sectie 5,
       137 en 161 zijn een VERWACHTING. */
    assert.deepEqual(
      ronde.perPassageUitslag,
      { ACHTERGRONDPASSAGE: 5, NIET_VASTSTELLENDE_MODALITEIT: 2, GEEN_AUTHENTIEK_STUK: 1 },
      "vijf uit de standpuntensectie (138-141 plus de verwoordbare kopie), twee op " +
        "modaliteit, en claim 79 op de vorm van het stuk",
    );
  });

  /* ================================================================
     DE ZES CONCRETE CLAIMS, één voor één
     ================================================================ */
  const verwacht: Record<string, { status: string; niveau: string | null; grond: string }> = {
    p137: { status: "ongeverifieerd", niveau: null, grond: "NIET_VASTSTELLENDE_MODALITEIT" },
    p138: { status: "ongeverifieerd", niveau: null, grond: "ACHTERGRONDPASSAGE" },
    p139: { status: "ongeverifieerd", niveau: null, grond: "ACHTERGRONDPASSAGE" },
    p140: { status: "ongeverifieerd", niveau: null, grond: "ACHTERGRONDPASSAGE" },
    p141: { status: "ongeverifieerd", niveau: null, grond: "ACHTERGRONDPASSAGE" },
    p161: { status: "ongeverifieerd", niveau: null, grond: "NIET_VASTSTELLENDE_MODALITEIT" },
  };

  for (const [label, v] of Object.entries(verwacht)) {
    test(`4 · claim ${label} — ${v.grond}`, async () => {
      const r = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const q = await c.query<{
          tekst: string;
          verificatie_status: string;
          bewijsniveau: string | null;
          bewijsniveau_reden: string | null;
          verwoordbaar: string | null;
        }>(
          `select tekst, verificatie_status, bewijsniveau, bewijsniveau_reden, verwoordbaar
             from intel.uitspraken where organisatie_id = $1 and id = $2`,
          [org, id[label]!],
        );
        return q.rows[0]!;
      });
      assert.equal(r.verificatie_status, v.status, `${label}: ${r.tekst.slice(0, 60)}`);
      assert.equal(r.bewijsniveau, v.niveau, "het bewijsniveau mag geen hard bewijs blijven beweren");
      assert.equal(r.bewijsniveau_reden, null, "en de reden hoort met het niveau mee te verdwijnen");

      /* DE OORSPRONKELIJKE CLAIMTEKST BLIJFT STAAN — eis 2. */
      const bron = BESLUIT.productiestand.find((p) => `p${p.id}` === label)!;
      assert.equal(r.tekst, bron.tekst, "de claimtekst mag niet zijn aangeraakt");
    });
  }

  test("5 · en de GROND staat per claim in het auditspoor", async () => {
    const sporen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{
        object_id: string;
        voor_waarde: Record<string, unknown>;
        na_waarde: Record<string, unknown>;
        motivatie: string;
      }>(
        `select object_id, voor_waarde, na_waarde, motivatie
           from intel.audit_gebeurtenissen
          where organisatie_id = $1 and handeling = $2
          order by id`,
        [org, HERBEOORDELING_HANDELING],
      );
      return q.rows;
    });
    assert.equal(sporen.length, 13, "één spoor per herbeoordeelde claim");

    for (const [label, v] of Object.entries(verwacht)) {
      const spoor = sporen.find((s) => s.object_id === String(id[label]!));
      assert.ok(spoor, `${label} hoort een auditregel te hebben`);
      /* DE VOORWAARDE BEWAART DE OORSPRONKELIJKE STAAT — eis 3, en dit
         is wat de ronde omkeerbaar maakt zonder eigen terugdraaipad. */
      assert.equal(spoor.voor_waarde["verificatie_status"], "bevestigd");
      assert.equal(spoor.voor_waarde["bewijsniveau"], "DIRECT_BEVESTIGD");
      assert.equal(spoor.na_waarde["verificatie_status"], "ongeverifieerd");
      assert.equal(spoor.na_waarde["passage_uitslag"], v.grond);
      assert.equal(spoor.na_waarde["passage_trekt_in"], true);
      assert.match(spoor.motivatie, /passagetoets/u, `${label}: ${spoor.motivatie}`);
    }
  });

  /* ================================================================
     DE GRENZEN VAN DE REPARATIE
     ================================================================ */
  test("6 · de EIGEN VASTSTELLING uit het dictum blijft bevestigd", async () => {
    const r = await leesClaim("dictum");
    assert.equal(r.verificatie_status, "bevestigd", "een ACM-vaststelling IS de authentieke bron");
    assert.equal(r.bewijsniveau, "DIRECT_BEVESTIGD", "en houdt haar bewijsniveau");
  });

  test("7 · ONTBREKENDE DOCUMENTTEKST trekt niets in", async () => {
    const r = await leesClaim("zonderTekst");
    assert.equal(
      r.verificatie_status,
      "bevestigd",
      "afwezigheid van tekst is geen bewijs van achtergrond",
    );
  });

  test("8 · ONTBREKENDE BRONPASSAGE trekt niets in", async () => {
    const r = await leesClaim("nietInStuk");
    assert.equal(
      r.verificatie_status,
      "bevestigd",
      "een zin die niet te localiseren is, valt buiten elke achtergrondregio",
    );
  });

  test("9 · de VERWOORDBAARHEID wordt opnieuw bepaald bij intrekking", async () => {
    const r = await leesClaim("verwoordbaar");
    assert.equal(r.verificatie_status, "ongeverifieerd");
    assert.equal(
      r.verwoordbaar,
      "VERIFICATIE_NODIG",
      "een claim die zijn bevestiging verliest, kan niet verwoordbaar blijven",
    );
    assert.match(r.verwoordbaar_reden ?? "", /ingetrokken/u);
  });

  test("10 · de overige verwoordbaarheden blijven staan", async () => {
    /* MEETHAAK OP DE VORIGE ZAAK. Zou de regel elke verwoordbaarheid
       omzetten, dan overschreef hij oordelen die deze ronde niet heeft
       weerlegd — en dan stond zaak 9 ook groen. */
      const r = await leesClaim("p140");
    assert.equal(r.verwoordbaar, "CONTEXT_ONVOLLEDIG", "CONTEXT_ONVOLLEDIG is niet weerlegd");
  });

  test("10b · claim 79 — een JURIDISCHE claim op een nieuwsbericht", async () => {
    /* GEEN_AUTHENTIEK_STUK, en dus NIET via de officiële-stukgrond. Dit
       is het bewijs dat de reparatie ook de juridische route draagt en
       niet alleen de nieuwe grond uit §2. */
    const r = await leesClaim("p79");
    assert.equal(r.verificatie_status, "ongeverifieerd");
    assert.equal(r.bewijsniveau, null);
  });

  test("11 · de GERECTIFICEERDE claims worden niet aangeraakt", async () => {
    /* MODEL VAN PRODUCTIECLAIMS 3 EN 4 — eis 4. Bevoegd gezag, maar een
       NIEUWSBERICHT: vormKanVaststellen() geeft daar onwaar, dus deze
       claims gaan niet langs de passagetoets. */
    for (const label of ["rect-oud", "rect-nieuw"]) {
      const r = await leesClaim(label);
      assert.equal(r.verificatie_status, "bevestigd", `${label} hoort bevestigd te blijven`);
      assert.equal(r.bewijsniveau, null, `${label} had geen niveau en hoort er geen te krijgen`);
    }
    /* En de correctieketen staat er nog. */
    const keten = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraak_correcties where organisatie_id = $1`,
        [org],
      );
      return q.rows[0]!.n;
    });
    assert.equal(keten, 1, "de rectificatie hoort onaangeroerd te zijn");
  });

  /* ================================================================
     IDEMPOTENTIE, KETEN EN BEVEILIGINGEN
     ================================================================ */
  test("12 · een tweede ronde vindt niets meer, en een derde ook niet", async () => {
    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(tweede.bekeken, 0, "de stempel is gezet, dus de selectie is leeg");
    assert.equal(tweede.passageIngetrokken, 0);

    const derde = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      herbeoordeelClaims(c, org, {}),
    );
    assert.equal(derde.bekeken, 0);

    /* EN GEEN DUBBELE CORRECTIE: het auditspoor is niet gegroeid. */
    const sporen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.audit_gebeurtenissen
          where organisatie_id = $1 and handeling = $2`,
        [org, HERBEOORDELING_HANDELING],
      );
      return q.rows[0]!.n;
    });
    assert.equal(sporen, 13, "twee extra rondes mogen geen extra sporen schrijven");
  });

  test("12b · de TAAK rapporteert de gronden, zodat de ronde na te meten is", async () => {
    /* DE ECHTE TAAK uit het REGISTER. In productie is de database niet
       van buiten te bevragen, dus als de gronden niet in dit log staan
       is een ronde daar niet na te meten. De selectie is na zaak 12
       leeg, dus dit meet de 0-vorm van de regel — en die moet er ook
       staan, want een ontbrekende regel leest als 'niets gebeurd'. */
    const handler = REGISTER["herbeoordeling"];
    assert.ok(handler, "er hoort een handler voor 'herbeoordeling' te zijn");
    const log = await handler(db.pool, org, {});
    assert.match(log, /op de passagetoets ingetrokken 0/u, log);
  });

  test("13 · bewijsniveau en verificatiestatus spreken elkaar niet tegen", async () => {
    /* DE STRIJD IS NIET 'HEEFT EEN NIVEAU' MAAR 'BEWEERT BEWIJS'.
       NIET_BEVESTIGD op een ingetrokken claim is juist consistent — dat
       is wat de semantiekronde er hierna op zet. De strijd is een
       ingetrokken claim die nog HARD BEWIJS beweert. Mijn eerste versie
       toetste 'bewijsniveau is not null' en was daarmee afhankelijk van
       de orde waarin de zaken in dit bestand lopen: vóór zaak 14 groen,
       erna rood. */
    const strijdig = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ id: number; verificatie_status: string; bewijsniveau: string }>(
        `select id, verificatie_status, bewijsniveau from intel.uitspraken
          where organisatie_id = $1
            and verificatie_status <> 'bevestigd'
            and bewijsniveau in ('DIRECT_BEVESTIGD','MEERVOUDIG_BEVESTIGD')`,
        [org],
      );
      return q.rows;
    });
    assert.deepEqual(strijdig, [], "een ingetrokken claim mag geen hard bewijs blijven beweren");

    /* EN DE KEERZIJDE, die 0055 als CHECK draagt: een bevestigde claim
       mag geen ander niveau dan DIRECT_BEVESTIGD hebben. */
    const andersom = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ id: number; bewijsniveau: string }>(
        `select id, bewijsniveau from intel.uitspraken
          where organisatie_id = $1 and verificatie_status = 'bevestigd'
            and bewijsniveau is not null and bewijsniveau <> 'DIRECT_BEVESTIGD'`,
        [org],
      );
      return q.rows;
    });
    assert.deepEqual(andersom, [], "0055: bevestigd vraagt DIRECT_BEVESTIGD of niets");
  });

  test("14 · de SEMANTIEKTAAK loopt hierna gewoon door, zonder DLQ", async () => {
    /* DE ECHTE TAAK, niet een nabouw. Hij moet de vrijgekomen
       bewijsniveaus opnieuw kunnen vullen zonder op
       uitspraken_bevestigd_vraagt_direct te stuiten — dat was de fout
       die taak 6887 in de DLQ bracht. */
    const handler = REGISTER["semantiek"];
    assert.ok(handler, "er hoort een handler voor 'semantiek' te zijn");
    const uitkomst = await handler(db.pool, org, {});
    /* HET RAPPORT ZOALS DE TAAK HEM WERKELIJK TERUGGEEFT. Gemeten:
         "bekeken 12, verrijkt 6, zonder uitdrukking 6, rondes 2,
          openstaande schaalcorrecties 0, claimpoort open,
          afdrukken 12/12, bewijsniveau 8 claim(s) over 9 bewering(en):
          NIET_BEVESTIGD=8 DIRECT_BEVESTIGD=1"
       Mijn eerste versie zocht het woord 'semantiek' in die string en
       was rood terwijl de taak gewoon klaar was. Dat de BEWIJSNIVEAU-
       stap erin staat is wat hier bewezen moet worden: dat is de stap
       die taak 6887 in de DLQ bracht. */
    assert.match(uitkomst, /bewijsniveau/u, uitkomst);
    assert.doesNotMatch(uitkomst, /\bfout\b|violates|constraint/iu, uitkomst);

    const nog = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ id: number; status: string; niveau: string | null }>(
        `select id, verificatie_status as status, bewijsniveau as niveau
           from intel.uitspraken
          where organisatie_id = $1
            and verificatie_status <> 'bevestigd' and bewijsniveau = 'DIRECT_BEVESTIGD'`,
        [org],
      );
      return q.rows;
    });
    assert.deepEqual(nog, [], "de semantiekronde mag geen hard bewijs terugzetten op een ingetrokken claim");
  });

  test("15 · de semantiekronde verhoogt geen enkele verificatiestatus", async () => {
    const bevestigd = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.uitspraken
          where organisatie_id = $1 and verificatie_status = 'bevestigd'`,
        [org],
      );
      return q.rows[0]!.n;
    });
    assert.equal(bevestigd, 5, "dictum, niet-localiseerbaar, zonder tekst en de twee RVO-claims");
  });

  test("16 · de PUBLICATIEBEVEILIGINGEN staan onaangeroerd", async () => {
    const r = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const beleid = await c.query<{
        auto_publiceren_aan: boolean;
        linkedin_machtiging: boolean;
      }>(
        `select auto_publiceren_aan, linkedin_machtiging from intel.publicatiebeleid
          where organisatie_id = $1`,
        [org],
      );
      const pub = await c.query<{ n: number }>(
        `select count(*)::int as n from intel.publicaties where organisatie_id = $1`,
        [org],
      );
      return { beleid: beleid.rows, publicaties: pub.rows[0]!.n };
    });
    assert.equal(r.publicaties, 0, "deze ronde publiceert niets");
    for (const b of r.beleid) {
      assert.equal(b.auto_publiceren_aan, false);
      assert.equal(b.linkedin_machtiging, false);
    }
  });

  /* ================================================================
     DE PURE FUNCTIE, zonder database
     ================================================================ */
  test("17 · herbeoordeelClaim ZONDER stuk gedraagt zich als voorheen", () => {
    /* DE TERUGWAARTSE COMPATIBILITEIT. `stuk` is optioneel, en zonder
       dat veld mag er niets veranderen — anders breekt deze uitbreiding
       de bestaande aanroepers. */
    const r = herbeoordeelClaim({
      oudeStatus: "bevestigd",
      oudeBewijskracht: 5,
      betrouwbaarheid: 5,
      isPrimaireBron: true,
      documentsoort: "OFFICIEEL_BESLUIT",
      gezag: "BEVOEGD_GEZAG",
      claimTekst: BESLUIT.productiestand.find((p) => p.id === 138)!.tekst,
      brondatum: "2026-11-01",
    });
    assert.equal(r.nieuweStatus, "bevestigd", "zonder brontekst verandert er niets");
    assert.equal(r.passageUitslag, null, "en de passagetoets is niet gelopen");
    assert.equal(r.passageTrektIn, false);
  });

  test("18 · en MET stuk trekt hij dezelfde claim in — de meethaak op zaak 17", () => {
    const r = herbeoordeelClaim({
      oudeStatus: "bevestigd",
      oudeBewijskracht: 5,
      betrouwbaarheid: 5,
      isPrimaireBron: true,
      documentsoort: "OFFICIEEL_BESLUIT",
      gezag: "BEVOEGD_GEZAG",
      claimTekst: BESLUIT.productiestand.find((p) => p.id === 138)!.tekst,
      brondatum: "2026-11-01",
      stuk: {
        documentTitel: BESLUIT.titel,
        documentTekst: BESLUIT.ruweTekst,
        documentvorm: "BEKENDMAKING",
        claimvorm: null,
        eigenGezagNamen: [],
      },
    });
    assert.equal(r.passageUitslag, "ACHTERGRONDPASSAGE");
    assert.equal(r.passageTrektIn, true);
    assert.equal(r.nieuweStatus, "ongeverifieerd");
    assert.match(r.reden, /Standpunten|achtergrondpassage/iu, r.reden);
  });

  test("19 · de passagetoets KENT NOOIT een bevestiging toe", () => {
    /* DE RICHTING, en dit is de reden dat een halve ronde veilig is.
       Een claim die al niet bevestigd was, komt er niet door de
       passagetoets bevestigd uit — ook niet als het stuk haar
       vaststelt. */
    const r = herbeoordeelClaim({
      oudeStatus: "ongeverifieerd",
      oudeBewijskracht: 5,
      betrouwbaarheid: 5,
      isPrimaireBron: true,
      documentsoort: "OFFICIEEL_BESLUIT",
      gezag: "BEVOEGD_GEZAG",
      claimTekst: EIGEN_VASTSTELLING,
      brondatum: "2026-11-01",
      stuk: {
        documentTitel: BESLUIT.titel,
        documentTekst: BESLUIT.ruweTekst,
        documentvorm: "BEKENDMAKING",
        claimvorm: null,
        eigenGezagNamen: [],
      },
    });
    assert.equal(r.nieuweStatus, "ongeverifieerd", "de toets promoveert nooit");
    assert.equal(r.passageUitslag, null, "hij wordt niet eens gesteld bij een niet-bevestigde claim");
  });

  /* ---------------------------------------------------------------- */
  async function leesClaim(label: string): Promise<{
    tekst: string;
    verificatie_status: string;
    bewijsniveau: string | null;
    verwoordbaar: string | null;
    verwoordbaar_reden: string | null;
  }> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const q = await c.query<{
        tekst: string;
        verificatie_status: string;
        bewijsniveau: string | null;
        verwoordbaar: string | null;
        verwoordbaar_reden: string | null;
      }>(
        `select tekst, verificatie_status, bewijsniveau, verwoordbaar, verwoordbaar_reden
           from intel.uitspraken where organisatie_id = $1 and id = $2`,
        [org, id[label]!],
      );
      return q.rows[0]!;
    });
  }
});
