/* ============================================================
   EENHEID — de acht niet-numerieke claimvormen en de zes datumrollen
   ------------------------------------------------------------
   DE MEETGRONDSLAG, 6 november 2026. Na de volledige herverwerking van
   4.004 bronversies stonden er 109 claims in productie, en alle 109
   waren van soort cijfer, prijs of datum. Van de negen toegestane
   soorten werden er dus drie geproduceerd; feit, regel, status en
   specificatie bestonden uitsluitend als toegestane waarde in een
   CHECK.

   Een steekproef van 135 versies uit datzelfde corpus (3.610 zinnen)
   geeft voor elk van de acht vormen uit de opdracht treffers:
   congestiestatus 92, projectstatus 28, specificatie 14,
   beleidswijziging 13, subsidievenster 10, verplichting 6, besluit 5,
   inwerkingtreding 2.

   ELKE POSITIEVE ZIN IN DIT BESTAND KOMT UIT DAT CORPUS of is er
   woordelijk op gemodelleerd. Elke tegenproef is een zin die het
   onderwerpswoord WEL bevat maar geen vorm: dat is de fout die een te
   breed patroon maakt, en die moet hier rood worden.
   ============================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  leesVormClaims,
  bepaalTijdstand,
  type Claimvorm,
} from "../../src/pijplijn/claimvorm.ts";
import { bepaalDatumrol, herkenBetreft } from "../../src/pijplijn/datumrol.ts";
import { bepaalModaliteit, NOODZAKELIJKE_ZEKERHEID } from "../../src/pijplijn/claimmodaliteit.ts";
import { extraheerUitspraken, isJuridischeClaim } from "../../src/pijplijn/uitspraken.ts";
import { bepaalClaimAard } from "../../src/pijplijn/claimaard.ts";
import { vormpoort } from "../../src/pijplijn/vormpoort.ts";
import { verwoordVorm } from "../../src/pijplijn/vormverwoording.ts";

function vormen(zin: string): Claimvorm[] {
  return leesVormClaims(zin).map((v) => v.vorm);
}

/* ------------------------------------------------------------------
   DE ACHT CATEGORIEEN, ELK MET EEN POSITIEVE EN EEN TEGENPROEF
   ------------------------------------------------------------------ */

test("1 · een feitelijk besluit wordt als BESLUIT gelezen", () => {
  const zin =
    "Per 1 juli 2026 werken netbeheerders ook voor kleinverbruikers in lijn met het " +
    "prioriteringskader dat de Autoriteit Consument & Markt heeft vastgesteld.";
  assert.ok(vormen(zin).includes("BESLUIT"), vormen(zin).join(","));
});

test("1t · tegenproef: 'besluitvorming' is geen genomen besluit", () => {
  const zin =
    "De besluitvorming over het nieuwe tariefstelsel vraagt zorgvuldigheid en betrokkenheid " +
    "van alle partijen in de sector.";
  assert.ok(!vormen(zin).includes("BESLUIT"), vormen(zin).join(","));
});

test("2 · een verplichting wordt als VERPLICHTING gelezen", () => {
  const zin =
    "Met de komst van de Energiewet vanaf 1 januari 2026 geldt de verplichting dat alle " +
    "huishoudens een slimme meter of een digitale meter krijgen.";
  assert.ok(vormen(zin).includes("VERPLICHTING"), vormen(zin).join(","));
});

test("2t · tegenproef: 'moet ervoor zorgen dat' is geen verplichting", () => {
  const zin =
    "Dat moet ervoor zorgen dat huishoudens meer inzicht krijgen in hun verbruik en " +
    "bewustere keuzes kunnen maken.";
  assert.ok(!vormen(zin).includes("VERPLICHTING"), vormen(zin).join(","));
});

test("3 · een inwerkingtreding wordt als INWERKINGTREDING gelezen", () => {
  const zin =
    "Sinds 29 mei 2026 zijn de herziene eisen uit de Europese richtlijn EPBD IV van kracht " +
    "in Nederland.";
  assert.ok(vormen(zin).includes("INWERKINGTREDING"), vormen(zin).join(","));
});

test("3t · tegenproef: een zin over de werking van een markt is geen inwerkingtreding", () => {
  const zin =
    "De werking van de onbalansmarkt is voor veel marktpartijen nog onvoldoende " +
    "doorzichtig om goed op te kunnen anticiperen.";
  assert.ok(!vormen(zin).includes("INWERKINGTREDING"), vormen(zin).join(","));
});

test("4 · een subsidievenster wordt als SUBSIDIEVENSTER gelezen", () => {
  const zin = "Het beschikbare subsidiebudget voor de aanvraagperiode 2026 is 1.775.000 euro.";
  assert.ok(vormen(zin).includes("SUBSIDIEVENSTER"), vormen(zin).join(","));
});

test("4t · tegenproef: het woord subsidie alleen opent geen venster", () => {
  const zin =
    "De subsidie voor warmtepompen is een van de instrumenten waarmee het kabinet de " +
    "verduurzaming van woningen ondersteunt.";
  assert.ok(!vormen(zin).includes("SUBSIDIEVENSTER"), vormen(zin).join(","));
});

test("5 · een congestiestatus wordt als CONGESTIESTATUS gelezen", () => {
  const zin =
    "Na een civiele procedure heeft Liander in april 2025 een herzien congestierapport " +
    "gepubliceerd voor het betrokken gebied.";
  assert.ok(vormen(zin).includes("CONGESTIESTATUS"), vormen(zin).join(","));
});

test("5t · tegenproef: het woord congestie alleen is geen status", () => {
  const zin =
    "Netcongestie is een van de grootste uitdagingen voor de energietransitie in Nederland " +
    "en vraagt samenwerking van alle partijen.";
  assert.ok(!vormen(zin).includes("CONGESTIESTATUS"), vormen(zin).join(","));
});

test("6 · een projectstatus wordt als PROJECTSTATUS gelezen", () => {
  const zin =
    "De nieuwe Carwash A27 in Nieuwegein is in gebruik genomen met 274 kilowattpiek aan " +
    "zonnepanelen en een batterij.";
  assert.ok(vormen(zin).includes("PROJECTSTATUS"), vormen(zin).join(","));
});

test("6t · tegenproef: 'opgeleverd' in de zin van resultaat is geen oplevering", () => {
  const zin =
    "Een mooi resultaat, maar het zegt nog niet of die aanpak ook heeft opgeleverd wat er " +
    "van tevoren beloofd is.";
  assert.ok(!vormen(zin).includes("PROJECTSTATUS"), vormen(zin).join(","));
});

test("7 · een technische specificatie wordt als SPECIFICATIE gelezen", () => {
  const zin = "Per 1 augustus 2026 gelden de nieuwe Aansluitspecificaties 4.0 voor publieke laadpalen.";
  assert.ok(vormen(zin).includes("SPECIFICATIE"), vormen(zin).join(","));
});

test("7t · tegenproef: 'specifiek' is geen specificatie", () => {
  const zin =
    "Voor deze doelgroep is een specifieke aanpak nodig die rekening houdt met de lokale " +
    "omstandigheden en het beschikbare budget.";
  assert.ok(!vormen(zin).includes("SPECIFICATIE"), vormen(zin).join(","));
});

test("8 · een beleidswijziging wordt als BELEIDSWIJZIGING gelezen", () => {
  const zin = "Het kabinet vervangt de huidige stikstofdoelen in de wet door uitstootdoelen.";
  assert.ok(vormen(zin).includes("BELEIDSWIJZIGING"), vormen(zin).join(","));
});

test("8t · tegenproef: een gewijzigde openingstijd is geen beleidswijziging", () => {
  const zin =
    "De agenda is op verzoek van de deelnemers gewijzigd zodat er meer tijd is voor de " +
    "inhoudelijke discussie.";
  assert.ok(!vormen(zin).includes("BELEIDSWIJZIGING"), vormen(zin).join(","));
});

/* ------------------------------------------------------------------
   IEDERE CLAIM HEEFT EEN CONCRETE BRONPASSAGE — de eis uit §4
   ------------------------------------------------------------------ */

test("elke vormclaim draagt een passage van minstens tien tekens", () => {
  const zinnen = [
    "Per 1 juli 2026 werken netbeheerders in lijn met het prioriteringskader dat de ACM heeft vastgesteld.",
    "Met de komst van de Energiewet geldt de verplichting dat alle huishoudens een slimme meter krijgen.",
    "Sinds 29 mei 2026 zijn de herziene eisen uit de richtlijn EPBD IV van kracht in Nederland.",
    "Het beschikbare subsidiebudget voor de aanvraagperiode 2026 is 1.775.000 euro.",
    "Liander heeft in april 2025 een herzien congestierapport gepubliceerd voor het gebied.",
    "De nieuwe laadlocatie in Nieuwegein is in gebruik genomen met zonnepanelen en een batterij.",
    "Per 1 augustus 2026 gelden de nieuwe Aansluitspecificaties 4.0 voor publieke laadpalen.",
    "Het kabinet vervangt de huidige stikstofdoelen in de wet door uitstootdoelen.",
  ];
  let geteld = 0;
  for (const z of zinnen) {
    for (const v of leesVormClaims(z)) {
      geteld += 1;
      assert.ok(
        v.passage.length >= 10,
        `vorm ${v.vorm} had een passage van ${v.passage.length} tekens: "${v.passage}"`,
      );
      /* DE PASSAGE MOET ECHT UIT DE ZIN KOMEN. Een passage die niet in
         de brontekst staat is geen bronpassage maar een samenvatting,
         en dan is de hele eis niets waard. */
      assert.ok(
        z.toLowerCase().includes(v.passage.toLowerCase().slice(0, 30)),
        `passage "${v.passage}" staat niet in de bronzin`,
      );
    }
  }
  assert.ok(geteld >= 8, `verwacht minstens acht vormclaims, kreeg ${geteld}`);
});

test("een zin korter dan 25 tekens levert geen vormclaim", () => {
  assert.deepEqual(leesVormClaims("Netcongestie"), []);
  assert.deepEqual(leesVormClaims("Is verboden."), []);
});

/* ------------------------------------------------------------------
   MODALITEIT EN TIJD — de vijf onderscheidingen uit §4
   ------------------------------------------------------------------ */

test("aangekondigd is niet in werking", () => {
  const aangekondigd = bepaalTijdstand(
    "De nieuwe tariefstructuur treedt per 1 januari 2028 in werking.",
  );
  assert.equal(aangekondigd.tijdstand, "AANGEKONDIGD");

  const inWerking = bepaalTijdstand(
    "Sinds 29 mei 2026 zijn de herziene eisen van kracht in Nederland.",
  );
  assert.equal(inWerking.tijdstand, "IN_WERKING");
  assert.notEqual(aangekondigd.tijdstand, inWerking.tijdstand);
});

test("tijdelijk is niet permanent", () => {
  const tijdelijk = bepaalTijdstand(
    "De RVO introduceert een tijdelijke overgangsregeling voor lopende aanvragen.",
  );
  assert.equal(tijdelijk.tijdstand, "TIJDELIJK");

  const permanent = bepaalTijdstand(
    "De structurele verplichting is van kracht voor alle netbeheerders in Nederland.",
  );
  assert.equal(permanent.tijdstand, "IN_WERKING");
});

test("een gesloten loket is VERLOPEN en overheerst een aankondiging", () => {
  const r = bepaalTijdstand(
    "De aanvraagperiode is gesloten; een nieuwe ronde treedt per 1 maart 2027 in werking.",
  );
  assert.equal(r.tijdstand, "VERLOPEN");
});

test("zonder tijdsignaal blijft de toestand ONBEPAALD en wordt niets aangenomen", () => {
  const r = bepaalTijdstand(
    "Het kabinet vervangt de huidige stikstofdoelen in de wet door uitstootdoelen.",
  );
  assert.equal(r.tijdstand, "ONBEPAALD");
});

test("kan is niet zal: een mogelijkheid draagt geen feit", () => {
  const kan = bepaalModaliteit({
    tekst: "Het uitvoeren van alle IBO-maatregelen kan tot 30 miljard euro besparen.",
  });
  assert.equal(kan.draagbaarAlsFeit, false, JSON.stringify(kan));
  assert.ok(
    kan.grondslag.signalen.some((s) => s.startsWith("mogelijkheid:")),
    JSON.stringify(kan.grondslag.signalen),
  );

  /* DE TEGENZIN MOET EEN ECHTE VASTSTELLING ZIJN.
     Mijn eerste ijkzin was "De tarieven voor grootverbruikers dalen in
     2026 met 12 procent" met peildatum 1 november 2026. Die zakte, en
     terecht: 'dalen' is tegenwoordige tijd en 2026 is het LOPENDE jaar,
     dus noemtAfgeslotenJaar() vuurt niet (strikt kleiner dan het
     peiljaar) en er is geen ander vaststellingssignaal. De zin komt dan
     uit op VASTGESTELD met 0,35 en draagt niet — precies het gedrag dat
     de kop van claimmodaliteit.ts belooft voor een zin zonder signaal.
     Het was mijn fixture die loog, niet de motor; dus de fixture is
     aangepast en niet het vocabulaire. */
  const zal = bepaalModaliteit({
    tekst: "Het maximumtarief bedraagt vanaf 1 januari 2027 nog 45 euro per maand.",
    peildatum: "2026-11-01",
  });
  assert.equal(zal.modaliteit, "VASTGESTELD");
  assert.ok(zal.zekerheid >= NOODZAKELIJKE_ZEKERHEID, `zekerheid ${zal.zekerheid}`);
  assert.equal(zal.draagbaarAlsFeit, true);
});

test("een mogelijkheid naast een vaststelling wordt geplafonneerd en draagt niet", () => {
  const r = bepaalModaliteit({
    tekst:
      "Liander concludeert dat congestiemanagement in dit gebied niet kan worden toegepast; " +
      "het aantal aanvragen steeg vorig jaar naar 120.",
    peildatum: "2026-11-01",
  });
  assert.equal(r.modaliteit, "VASTGESTELD");
  assert.ok(r.zekerheid <= 0.45, `zekerheid ${r.zekerheid}`);
  assert.equal(r.draagbaarAlsFeit, false);
});

test("een voornemen is geen vastgesteld besluit", () => {
  const r = bepaalModaliteit({
    tekst: "Het kabinet is voornemens de salderingsregeling per 2027 af te bouwen.",
  });
  assert.equal(r.modaliteit, "VOORSTEL");
  assert.equal(r.draagbaarAlsFeit, false);
});

test("verwacht is niet gerealiseerd", () => {
  const verwacht = bepaalModaliteit({
    tekst: "Naar verwachting stijgt het aantal aansluitingen in 2028 met 40 procent.",
  });
  assert.equal(verwacht.modaliteit, "VERWACHTING");
  assert.equal(verwacht.draagbaarAlsFeit, false);
});

/* ------------------------------------------------------------------
   DE ZES DATUMROLLEN UIT §5
   ------------------------------------------------------------------ */

test("datumrol · een concrete aanvraagperiode", () => {
  const r = bepaalDatumrol(
    "Aanvragen kunnen van 1 maart 2027 tot en met 30 september 2027 worden ingediend voor de subsidieregeling.",
  );
  assert.equal(r.rol, "AANVRAAGPERIODE", r.reden);
  assert.ok(r.passage.length >= 10);
});

test("datumrol · een startdatum", () => {
  const r = bepaalDatumrol("De nieuwe Aansluitspecificaties gelden per 1 augustus 2026.");
  assert.equal(r.rol, "STARTDATUM", r.reden);
});

test("datumrol · een einddatum", () => {
  const r = bepaalDatumrol("De subsidieregeling sluit op 31 december 2027 voor nieuwe aanvragen.");
  assert.equal(r.rol, "EINDDATUM", r.reden);
});

test("datumrol · 'voor <datum>' is een einddatum, net als in de extractie", () => {
  /* DE ASYMMETRIE DIE DE ECHTE DATA OPLEVERDE. zoekDatums() rekent
     'voor' al tot de eindgrenzen en zette geldig_tot; dit bestand kende
     die vorm niet. Gemeten op productieclaim 16:

       "Aanvragen ontvangen voor 1 juli 2026 — Kleinverbruikaanvragen
        worden toegekend"

     Die claim had een geldig_tot én rol LOSSE_DATUM. Twee lagen, één
     woordenboek — dat is de regel die hier wordt vastgezet. */
  const r = bepaalDatumrol(
    "Aanvragen voor de subsidieregeling ontvangen voor 1 juli 2026 worden nog toegekend.",
  );
  assert.equal(r.rol, "EINDDATUM", r.reden);
});

test("datumrol · een publicatiedatum is geen ingangsdatum", () => {
  const r = bepaalDatumrol(
    "Op 2 juni 2026 publiceerde de ACM de bestuurlijke afspraken over het congestiebeleid.",
  );
  assert.equal(r.rol, "PUBLICATIEDATUM", r.reden);
  assert.notEqual(r.rol, "STARTDATUM");
});

test("datumrol · een verwachte datum is geen vastgestelde datum", () => {
  const r = bepaalDatumrol(
    "De regeling treedt naar verwachting op 1 juli 2027 in werking, maar die datum staat nog niet vast.",
  );
  assert.equal(r.rol, "VERWACHTE_DATUM", r.reden);
});

test("datumrol · een losse datum zonder context blijft LOSSE_DATUM en krijgt geen passage", () => {
  const r = bepaalDatumrol(
    "Tijdens het congres op 14 maart 2027 spreken verschillende deskundigen over het onderwerp.",
  );
  assert.equal(r.rol, "LOSSE_DATUM", r.reden);
  assert.equal(r.passage, "");
});

test("een losse datum komt nooit door de vormpoort — de regel uit §5", () => {
  const r = vormpoort({
    vorm: null,
    datumrol: "LOSSE_DATUM",
    datumBetreft: "de regeling",
    passage: "een passage van voldoende lengte",
    tijdstand: null,
    modaliteit: "VASTGESTELD",
    modaliteitZekerheid: 0.9,
    verificatieStatus: "bevestigd",
    heeftBewijs: true,
    vervangenDoor: null,
    dagenOud: 1,
    houdbaarheidDagen: 400,
    magCiteren: true,
    toepassingsgebied: "NEDERLAND",
    toepassingsgebiedGrondslag: "de bronzin noemt Nederland expliciet",
    kanVerwoorden: () => true,
  });
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(r.reden, /losse datum is niet automatisch een verwoordbare claim/);
});

test("een datum zonder herkenbaar onderwerp wordt niet verwoordbaar", () => {
  const r = vormpoort({
    vorm: null,
    datumrol: "STARTDATUM",
    datumBetreft: null,
    passage: "met ingang van 1 juli 2027",
    tijdstand: null,
    modaliteit: "VASTGESTELD",
    modaliteitZekerheid: 0.9,
    verificatieStatus: "bevestigd",
    heeftBewijs: true,
    vervangenDoor: null,
    dagenOud: 1,
    houdbaarheidDagen: 400,
    magCiteren: true,
    toepassingsgebied: "NEDERLAND",
    toepassingsgebiedGrondslag: "de bronzin noemt Nederland expliciet",
    kanVerwoorden: () => true,
  });
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(r.reden, /geen onderwerp/);
});

/* ------------------------------------------------------------------
   DE POORT IS NIET MILDER DAN DE GETALPOORT
   ------------------------------------------------------------------ */

const GOEDE_INVOER = {
  vorm: "INWERKINGTREDING" as Claimvorm,
  datumrol: null,
  datumBetreft: "de Europese richtlijn",
  passage: "zijn de herziene eisen van kracht",
  tijdstand: "IN_WERKING" as const,
  modaliteit: "VASTGESTELD" as const,
  modaliteitZekerheid: 0.8,
  verificatieStatus: "bevestigd",
  heeftBewijs: true,
  vervangenDoor: null,
  dagenOud: 10,
  houdbaarheidDagen: 700,
  magCiteren: true,
  toepassingsgebied: "NEDERLAND" as const,
  toepassingsgebiedGrondslag: "de bronzin noemt Nederland expliciet",
  kanVerwoorden: () => true,
};

test("de ijkmeting: volledige invoer wordt VERWOORDBAAR", () => {
  assert.equal(vormpoort(GOEDE_INVOER).uitslag, "VERWOORDBAAR");
});

test("meethaak · zonder primaire bronversie weigert de poort", () => {
  const r = vormpoort({ ...GOEDE_INVOER, heeftBewijs: false });
  assert.equal(r.uitslag, "VERIFICATIE_NODIG");
});

test("meethaak · een onbevestigde claim komt er niet door", () => {
  const r = vormpoort({ ...GOEDE_INVOER, verificatieStatus: "ongeverifieerd" });
  assert.equal(r.uitslag, "VERIFICATIE_NODIG");
});

test("meethaak · zonder passage weigert de poort", () => {
  const r = vormpoort({ ...GOEDE_INVOER, passage: "kort" });
  assert.equal(r.uitslag, "VERIFICATIE_NODIG");
  assert.match(r.reden, /bronpassage/);
});

test("meethaak · een voorstel wordt geen feit", () => {
  const r = vormpoort({ ...GOEDE_INVOER, modaliteit: "VOORSTEL" });
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(r.reden, /'kan' is niet 'zal'/);
});

test("meethaak · een te lage modaliteitszekerheid wordt geen feit", () => {
  const r = vormpoort({ ...GOEDE_INVOER, modaliteitZekerheid: 0.35 });
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(r.reden, /geraden en niet/);
});

test("meethaak · een Belgisch feit wordt geweigerd", () => {
  const r = vormpoort({ ...GOEDE_INVOER, toepassingsgebied: "BELGIE" });
  assert.equal(r.uitslag, "BUITEN_TOEPASSINGSGEBIED");
});

test("meethaak · een onbekend gebied wordt even hard geweigerd als Belgie", () => {
  const r = vormpoort({ ...GOEDE_INVOER, toepassingsgebied: "ONBEKEND" });
  assert.equal(r.uitslag, "BUITEN_TOEPASSINGSGEBIED");
});

test("meethaak · een verlopen houdbaarheid levert VEROUDERD", () => {
  const r = vormpoort({ ...GOEDE_INVOER, dagenOud: 900, houdbaarheidDagen: 700 });
  assert.equal(r.uitslag, "VEROUDERD");
});

test("meethaak · een vervangen claim levert VEROUDERD", () => {
  const r = vormpoort({
    ...GOEDE_INVOER,
    vervangenDoor: { id: 42, soort: "rectificatie" },
  });
  assert.equal(r.uitslag, "VEROUDERD");
});

test("meethaak · een inwerkingtreding zonder toestand komt er niet door", () => {
  const r = vormpoort({ ...GOEDE_INVOER, tijdstand: "ONBEPAALD" });
  assert.equal(r.uitslag, "CONTEXT_ONVOLLEDIG");
  assert.match(r.reden, /geldt het al/);
});

test("een congestiestatus zonder toestand mag wel door: de toestand zit in de claim", () => {
  const r = vormpoort({
    ...GOEDE_INVOER,
    vorm: "CONGESTIESTATUS",
    tijdstand: "ONBEPAALD",
  });
  assert.equal(r.uitslag, "VERWOORDBAAR", r.reden);
});

/* ------------------------------------------------------------------
   DE VERWOORDING NEEMT DE BRONPASSAGE NIET MEE
   ------------------------------------------------------------------ */

test("de verwoorde zin citeert de bron niet", () => {
  const zin = verwoordVorm({
    vorm: "INWERKINGTREDING",
    datumrol: null,
    datumBetreft: "de Europese richtlijn",
    tijdstand: "IN_WERKING",
    geldigVanaf: "2026-05-29",
    geldigTot: null,
    uitgever: "Netbeheer Nederland",
  });
  assert.ok(zin !== null);
  assert.ok(zin.length >= 25, `zin van ${zin.length} tekens: ${zin}`);
  assert.ok(!zin.includes("herziene eisen"), zin);
  assert.match(zin, /Volgens Netbeheer Nederland/);
  assert.match(zin, /29 mei 2026/);
});

test("een aankondiging en een inwerkingtreding leveren verschillende zinnen", () => {
  const basis = {
    vorm: "VERPLICHTING" as Claimvorm,
    datumrol: null,
    datumBetreft: "de verplichting",
    geldigVanaf: null,
    geldigTot: null,
    uitgever: "de ACM",
  };
  const a = verwoordVorm({ ...basis, tijdstand: "AANGEKONDIGD" });
  const b = verwoordVorm({ ...basis, tijdstand: "IN_WERKING" });
  assert.ok(a !== null && b !== null);
  assert.notEqual(a, b);
  assert.match(a, /aangekondigd en nog niet van kracht/);
  assert.match(b, /nu van kracht/);
});

test("een losse datum levert geen zin, ook niet buiten de poort om", () => {
  const zin = verwoordVorm({
    vorm: null,
    datumrol: "LOSSE_DATUM",
    datumBetreft: "de regeling",
    tijdstand: null,
    geldigVanaf: "2027-03-14",
    geldigTot: null,
    uitgever: "de ACM",
  });
  assert.equal(zin, null);
});

test("een aanvraagperiode met twee grenzen noemt beide", () => {
  const zin = verwoordVorm({
    vorm: null,
    datumrol: "AANVRAAGPERIODE",
    datumBetreft: "de SDE++-regeling",
    tijdstand: null,
    geldigVanaf: "2027-03-01",
    geldigTot: "2027-09-30",
    uitgever: "RVO",
  });
  assert.ok(zin !== null);
  assert.match(zin, /1 maart 2027/);
  assert.match(zin, /30 september 2027/);
});

/* ------------------------------------------------------------------
   DE EXTRACTIE ALS GEHEEL
   ------------------------------------------------------------------ */

test("één zin kan twee verschillende vormen dragen, en beide blijven bestaan", () => {
  const u = extraheerUitspraken(
    "",
    "Per 1 augustus 2026 gelden de nieuwe Aansluitspecificaties 4.0 voor publieke laadpalen.",
  );
  const gevonden = u.map((x) => x.claimvorm).filter((x): x is Claimvorm => !!x);
  assert.ok(gevonden.includes("SPECIFICATIE"), gevonden.join(","));
  assert.ok(gevonden.includes("INWERKINGTREDING"), gevonden.join(","));
});

test("een getalclaim krijgt geen vorm, rol of passage", () => {
  const u = extraheerUitspraken("", "De tarieven dalen in 2026 met 12 procent.");
  const cijfers = u.filter((x) => x.soort === "cijfer");
  assert.ok(cijfers.length >= 1);
  for (const c of cijfers) {
    assert.equal(c.claimvorm ?? null, null);
    assert.equal(c.datumrol ?? null, null);
    assert.equal(c.bronpassage ?? null, null);
  }
});

test("een aanvraagperiode wordt één claim met twee grenzen", () => {
  const u = extraheerUitspraken(
    "",
    "Aanvragen voor de subsidieregeling kunnen van 1 maart 2027 tot en met 30 september 2027 worden ingediend.",
  );
  const datums = u.filter((x) => x.soort === "datum");
  assert.equal(datums.length, 1, JSON.stringify(datums));
  assert.equal(datums[0]?.geldigVanaf, "2027-03-01");
  assert.equal(datums[0]?.geldigTot, "2027-09-30");
  assert.equal(datums[0]?.datumrol, "AANVRAAGPERIODE");
});

test("'van' wordt alleen een startdatum als er een eindgrens in de zin staat", () => {
  const metEind = extraheerUitspraken(
    "",
    "Aanvragen kunnen van 1 maart 2027 tot en met 30 september 2027 worden ingediend.",
  ).filter((x) => x.soort === "datum");
  assert.equal(metEind[0]?.geldigVanaf, "2027-03-01");

  const zonderEind = extraheerUitspraken(
    "",
    "In de brief van 3 juni 2026 beschrijft de minister de stand van zaken rond het net.",
  ).filter((x) => x.soort === "datum");
  assert.equal(zonderEind.length, 1, JSON.stringify(zonderEind));
  assert.equal(zonderEind[0]?.geldigVanaf, null, "een genitief-'van' is geen ingangsdatum");
});

test("een vormclaim krijgt geen geldig_vanaf, zodat de aangekondigd-grendel klopt", () => {
  const u = extraheerUitspraken(
    "",
    "De nieuwe tariefstructuur treedt per 1 januari 2028 in werking voor alle netbeheerders.",
  );
  for (const x of u.filter((y) => y.claimvorm)) {
    assert.equal(x.geldigVanaf, null, `${x.claimvorm} had geldig_vanaf ${x.geldigVanaf}`);
    if (x.tijdstand === "AANGEKONDIGD") assert.equal(x.geldigVanaf, null);
  }
});

/* ------------------------------------------------------------------
   DE JURIDISCHE VORMEN — de regel die de bestaande toets opleverde
   ------------------------------------------------------------------ */

test("een BESLUIT is juridisch, ook als de zin geen juridische markering draagt", () => {
  const zin = "Geschilbesluit Jumbo – Liander over congestierapport";
  /* DIT IS DE GEMETEN ZIN uit productieversie 3673, een OFFICIEEL_BESLUIT
     van BEVOEGD_GEZAG dat zichzelf MAG bevestigen. bepaalClaimAard()
     vindt er niets juridisch in — geen verplichting, geen gebod, geen
     inwerkingtreding — en zonder de vormingang zou de claim dus met
     juridisch=false langs de vaststellingstoets zijn gegaan. */
  assert.equal(bepaalClaimAard(zin).juridisch, false, "de zin draagt echt geen markering");
  assert.equal(isJuridischeClaim(false, "BESLUIT"), true);
  assert.equal(isJuridischeClaim(false, "VERPLICHTING"), true);
  assert.equal(isJuridischeClaim(false, "INWERKINGTREDING"), true);
});

test("de vijf niet-juridische vormen krijgen geen extra bewijslast uit hun vorm", () => {
  for (const v of [
    "SUBSIDIEVENSTER",
    "CONGESTIESTATUS",
    "PROJECTSTATUS",
    "SPECIFICATIE",
    "BELEIDSWIJZIGING",
  ]) {
    assert.equal(isJuridischeClaim(false, v), false, v);
    /* maar een juridische markering IN DE ZIN telt onverkort door. */
    assert.equal(isJuridischeClaim(true, v), true, v);
  }
});

test("een getalclaim zonder vorm volgt alleen bepaalClaimAard", () => {
  assert.equal(isJuridischeClaim(false, null), false);
  assert.equal(isJuridischeClaim(true, null), true);
});

test("het betreft-vocabulaire verzint niets", () => {
  assert.equal(herkenBetreft("Er gebeurt deze week iets opmerkelijks in de sector."), null);
  assert.equal(herkenBetreft("De SDE++ wordt verlengd."), "de SDE++-regeling");
});
