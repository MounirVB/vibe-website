/* ============================================================
   SEMANTIEK OPSLAAN EN BIJVULLEN
   ------------------------------------------------------------
   Twee wegen naar dezelfde velden:

     1. NIEUWE uitspraken krijgen hun semantiek bij het schrijven.
     2. BESTAANDE uitspraken worden bijgevuld uit hun eigen bronzin,
        die al in `intel.uitspraken.tekst` staat.

   Dat tweede is de reden dat een backfill hier mogelijk is zonder iets
   te verzinnen: de bronzin is bewaard, dus de semantiek is te meten in
   plaats van te raden. Lukt dat niet, dan blijft de uitspraak leeg en
   dat is de uitkomst.

   WAT DE BACKFILL NOOIT DOET

   - een verificatiestatus verhogen
   - een bestaande waarde overschrijven met een andere waarde
   - een mensbesluit aanraken
   - een veld vullen dat niet uit de bronzin volgt

   Hij is idempotent (dezelfde invoer geeft dezelfde uitkomst),
   hervatbaar (werkt per batch op id-orde) en navraagbaar (schrijft
   `semantiek_herkomst` en een auditregel per ronde).
   ============================================================ */

import type pg from "pg";
import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { leesUitdrukkingen, type Uitdrukking } from "./uitdrukking.ts";
import {
  leidSemantiekAf,
  verwoordbaarheidspoort,
  type Semantiek,
  type Verwoordbaarheid,
} from "./semantiek.ts";
import { verwoord } from "./verwoord.ts";
import { leesVormClaims, type Claimvorm, type Tijdstand } from "./claimvorm.ts";
import { bepaalDatumrol, type Datumrol } from "./datumrol.ts";
import { vormpoort } from "./vormpoort.ts";
import { verwoordVorm } from "./vormverwoording.ts";
import { bepaalToepassingsgebied, type Toepassingsgebied } from "./jurisdictie.ts";
import type { Modaliteit } from "./claimmodaliteit.ts";

const log = maakLogger("semantiek");

/** Hoe lang een soort uitspraak houdbaar is, in dagen. */
export const HOUDBAARHEID_DAGEN: Readonly<Record<string, number>> = {
  /* Tarieven worden per jaar vastgesteld; ouder dan een jaarcyclus is
     niet meer de stand van zaken. */
  bedrag: 400,
  percentage: 400,
  /* Een netcapaciteit verschuift per kwartaal. */
  netcapaciteit: 120,
  /* Een technische specificatie verandert niet van jaar tot jaar. */
  vermogen: 1100,
  energie: 1100,
  termijn: 400,
  kwalitatief: 700,
};

export type SemantiekRij = {
  id: number;
  gebeurtenis_id: number;
  tekst: string | null;
  soort: string;
  waarde_numeriek: string | null;
  eenheid: string | null;
  onderwerp: string | null;
  verificatie_status: string;
  bewijs_kwaliteit: number;
  semantiek_soort: string | null;
  heeft_bewijs: boolean;
  mag_citeren: boolean;
  dagen_oud: number | null;
  uitgever: string | null;
  is_primaire_bron: boolean;
  brondatum: string | null;
  vervangen_door: number | null;
  vervangen_soort: string | null;
  /* ------------------------------------------------------------------
     DE VELDEN VAN DE NIET-NUMERIEKE ROUTE (0054 + vormpoort.ts).

     Voor de 39 datumclaims die op 6 november 2026 in productie stonden
     zijn claimvorm, datumrol en bronpassage NULL: die claims zijn
     ouder dan 0054. verrijkVorm() LEIDT ZE AF uit `tekst`, precies
     zoals de getalroute de uitdrukking uit `tekst` afleidt. Dat is de
     reden dat een backfill hier niets hoeft te verzinnen: de bronzin is
     bewaard.
     ------------------------------------------------------------------ */
  /* OPTIONEEL, en dat is geen slordigheid. De toetsen bouwen een
     SemantiekRij met de hand om één poortcontrole te kunnen forceren;
     zouden deze zes velden verplicht zijn, dan moest elke bestaande
     toets ze meegeven zonder dat ze er iets mee doet. Elke leesplek
     hieronder normaliseert met `?? null`, dus een ontbrekend veld en
     een leeg veld geven hetzelfde oordeel. */
  claimvorm?: string | null;
  datumrol?: string | null;
  tijdstand?: string | null;
  bronpassage?: string | null;
  modaliteit?: string | null;
  modaliteit_zekerheid?: string | null;
};

export type Verrijking = {
  readonly id: number;
  readonly semantiek: Semantiek;
  readonly uitdrukking: Uitdrukking;
  readonly uitslag: Verwoordbaarheid;
  readonly reden: string;
  readonly zin: string | null;
};

/**
 * Leidt de semantiek van één uitspraakrij af en laat de poort erop los.
 *
 * Geeft null terug als er geen getaluitdrukking in de bronzin te vinden
 * is; dan valt er niets te verrijken en blijft de rij zoals hij was.
 */
export function verrijk(rij: SemantiekRij): Verrijking | null {
  if (!rij.tekst) return null;

  /* DE UITDRUKKING MOET BIJ DE BEWAARDE WAARDE PASSEN.
     Een bronzin kan meer getallen bevatten dan deze uitspraak; we
     zoeken de uitdrukking waarvan de waarde overeenkomt. Vinden we die
     niet, dan is de koppeling niet vast te stellen en verzinnen we er
     geen. */
  const kandidaten = leesUitdrukkingen(rij.tekst);
  if (kandidaten.length === 0) return null;

  const bewaard = rij.waarde_numeriek === null ? null : Number(rij.waarde_numeriek);
  let u: Uitdrukking | undefined;
  let schaalverlies: { bewaard: number; bron: Uitdrukking } | null = null;

  if (bewaard === null) {
    /* GEEN BEWAARDE WAARDE IS GEEN VRIJBRIEF OM DE EERSTE TE PAKKEN.
       ----------------------------------------------------------------
       Hier stond `u = kandidaten[0]`. Een uitspraak zonder numerieke
       grootheid — een DATUMuitspraak bijvoorbeeld, of een rij waarvan
       de extractie geen getal opleverde — kreeg daarmee de EERSTE
       getaluitdrukking uit zijn bronzin opgeplakt. Er is geen enkele
       grond waarom dat de juiste zou zijn: de koppeling tussen de
       uitspraak en dat getal is nooit vastgesteld.

       Dat is precies wat de toelichting vier regels hoger verbiedt
       ("vinden we die niet, dan is de koppeling niet vast te stellen en
       verzinnen we er geen") en wat de EXACT-OF-NIETS-regel hieronder
       voor de andere tak al afdwingt. Alleen de tweede poort
       (CONTEXT_ONVOLLEDIG) hield het geval tot nu toe tegen, en dat is
       toeval en geen grendel: één poort die om een andere reden
       afkeurt, is geen controle op deze koppeling.

       `null` is hier het bestaande kanaal: de aanroeper telt die rij
       als `zonderUitdrukking` en laat hem ongewijzigd staan. Strikt
       beperkender — er verdwijnt geen verrijking die ergens op rustte.

       GEMETEN NEVENFEIT: in de productieronde van 13 oktober stond
       `bekeken 20, verrijkt 0, zonder uitdrukking 20`. Alle twintig
       vielen al af op `kandidaten.length === 0`, dus deze tak werd in
       die ronde niet geraakt. Deze wijziging verandert dat cijfer
       vandaag dus niet; hij sluit een gat dat openstond. */
    return null;
  } else {
    /* EXACT, OF NIETS.
       ----------------------------------------------------------------
       De eerste versie had hier een tweede poging: als geen kandidaat
       exact matchte, werd er gezocht naar een kandidaat die ná deling
       door zijn schaalfactor wél matchte. Dat leek slim — zo vond hij de
       rijen die door het oude schaalverlies verkeerd stonden — en het
       was fout.

       Gevolg, gemeten: uitspraak 9 had waarde 235 en bronzin
       'EUR 235 miljoen'. De fallback koos de kandidaat met waarde
       235.000.000, de poort toetste DIE waarde (die rijmt) en de
       verwoorder gebruikte de BEWAARDE waarde 235. Uitkomst:
       "investeert de overheid EUR 235 in het net" waar de bron
       235 miljoen zegt. Precies de fout die deze release moet
       uitbannen, nu geproduceerd door de reparatie zelf.

       Dus: een divergentie is geen match maar een VONDST. De uitspraak
       wordt niet verwoordbaar en het verschil wordt gemeld. */
    u = kandidaten.find((k) => Math.abs(k.waarde - bewaard) < 1e-9);
    if (!u) {
      const viaSchaal = kandidaten.find(
        (k) => k.schaalwoord !== null && Math.abs(k.waarde / factorVan(k.schaalwoord) - bewaard) < 1e-9,
      );
      if (viaSchaal) schaalverlies = { bewaard, bron: viaSchaal };
    }
  }

  /* SCHAALVERLIES GEVONDEN: niet verwoorden, wel vastleggen. */
  if (schaalverlies) {
    const bron = schaalverlies.bron;
    return {
      id: rij.id,
      semantiek: leidSemantiekAf(rij.tekst, bron, {
        uitgever: rij.uitgever,
        isPrimaireBron: rij.is_primaire_bron,
      }),
      /* De uitdrukking van de BRON bewaren, met de bewaarde waarde
         ernaast: zo is het verschil in de database te zien. */
      uitdrukking: { ...bron, waarde: schaalverlies.bewaard },
      uitslag: "VERIFICATIE_NODIG",
      reden:
        `de bewaarde waarde ${schaalverlies.bewaard} wijkt een factor ` +
        `${factorVan(bron.schaalwoord!)} af van de bronuitdrukking '${bron.uitdrukking}'. ` +
        `Het schaalwoord '${bron.schaalwoord}' is bij de extractie verdwenen. De waarde wordt ` +
        `NIET aangepast — dat is een correctie en hoort via intel.uitspraak_correcties te gaan — ` +
        `maar deze uitspraak is tot die tijd niet verwoordbaar.`,
      zin: null,
    };
  }

  if (!u) return null;

  const semantiek = leidSemantiekAf(rij.tekst, u, {
    uitgever: rij.uitgever,
    isPrimaireBron: rij.is_primaire_bron,
  });
  const houdbaarheid = HOUDBAARHEID_DAGEN[semantiek.soort] ?? null;
  const invoer = {
    semantiek,
    uitdrukking: u,
    uitgever: rij.uitgever,
    brondatum: rij.brondatum,
    bronzin: rij.tekst,
  };

  const poort = verwoordbaarheidspoort({
    semantiek,
    uitdrukking: u,
    verificatieStatus: rij.verificatie_status,
    bewijsKwaliteit: rij.bewijs_kwaliteit,
    heeftBewijs: rij.heeft_bewijs,
    vervangenDoor:
      rij.vervangen_door !== null
        ? { id: rij.vervangen_door, soort: rij.vervangen_soort ?? "onbekend" }
        : null,
    dagenOud: rij.dagen_oud,
    houdbaarheidDagen: houdbaarheid,
    magCiteren: rij.mag_citeren,
    kanVerwoorden: () => verwoord(invoer) !== null,
  });

  return {
    id: rij.id,
    semantiek,
    uitdrukking: u,
    uitslag: poort.uitslag,
    reden: poort.reden,
    zin: poort.uitslag === "VERWOORDBAAR" ? verwoord(invoer) : null,
  };
}

/* ==================================================================
   DE TWEEDE ROUTE — vorm- en datumclaims
   ------------------------------------------------------------------
   verrijk() hierboven geeft null voor elke claim zonder
   `waarde_numeriek`, en dat is de juiste keuze voor de getalroute: de
   koppeling tussen zo'n claim en een willekeurig getal uit zijn bronzin
   is nooit vastgesteld (zie de toelichting daar). Het gevolg was wel
   dat de 39 datumclaims in productie nooit beoordeeld werden.

   Deze route is het antwoord. Hij leidt de VORM of de ROL af uit
   `tekst` — de bronzin staat er, dus er wordt gemeten en niet geraden —
   en laat vormpoort.ts erop los.

   WAT DEZE ROUTE NOOIT DOET, identiek aan de lijst in de kop van dit
   bestand: geen verificatiestatus verhogen, geen bestaande waarde
   overschrijven, geen mensbesluit aanraken, geen veld vullen dat niet
   uit de bronzin volgt.
   ================================================================== */

/** De soorten die via de vormroute gaan, en niet via de getalroute. */
const VORMSOORTEN: ReadonlySet<string> = new Set([
  "datum",
  "regel",
  "status",
  "specificatie",
  "feit",
]);

export type VormVerrijking = {
  readonly id: number;
  readonly semantiekSoort: string;
  readonly claimvorm: Claimvorm | null;
  readonly datumrol: Datumrol | null;
  readonly tijdstand: Tijdstand | null;
  readonly bronpassage: string | null;
  readonly betreft: string | null;
  readonly toepassingsgebied: Toepassingsgebied;
  readonly toepassingsgebiedGrondslag: string;
  readonly uitslag: Verwoordbaarheid;
  readonly reden: string;
  readonly zin: string | null;
};

/**
 * Leidt vorm of datumrol af voor één rij en laat de vormpoort erop los.
 *
 * Geeft null als deze rij niet op deze route hoort — dan is het geen
 * uitslag maar een verkeerde aanroep, en telt de aanroeper hem niet mee.
 */
export function verrijkVorm(rij: SemantiekRij): VormVerrijking | null {
  if (!rij.tekst) return null;
  if (!VORMSOORTEN.has(rij.soort)) return null;

  /* HET TOEPASSINGSGEBIED, uit dezelfde motor als de getalroute. Een
     eigen beslisregel hier zou betekenen dat een Belgisch besluit langs
     een andere maatstaf wordt gewogen dan een Belgisch tarief. */
  const jur = bepaalToepassingsgebied({
    tekst: rij.tekst,
    uitgever: rij.uitgever,
    isPrimaireBron: rij.is_primaire_bron,
  });
  const gebiedGrondslag = jur.grondslag.join("; ");

  /* ---------- DE DATUMROUTE ---------- */
  if (rij.soort === "datum") {
    const rol = bepaalDatumrol(rij.tekst);
    /* DE VASTGELEGDE ROL GAAT VOOR DE AFGELEIDE. Staat er al een
       datumrol in de database, dan is die door een eerdere ronde of
       door een mens gezet en hoort een backfill hem niet te
       overschrijven — dezelfde regel als voor elke andere kolom in dit
       bestand. */
    const vastgelegdeRol = (rij.datumrol ?? null) as Datumrol | null;
    const afgeleideRol = rol.rol;
    /* `?? null` omdat SemantiekRij.bronpassage optioneel is: de toetsen
       bouwen een rij met de hand en laten hem weg. Een ontbrekend veld
       en een leeg veld horen hier hetzelfde te betekenen. */
    const vastgelegdePassage = rij.bronpassage ?? null;
    const afgeleidePassage = rol.passage.length >= 10 ? rol.passage : null;

    /* EEN ROL EN EEN PASSAGE GAAN SAMEN, OF GEEN VAN BEIDE.
       ----------------------------------------------------------------
       GEMETEN IN PRODUCTIE op 6 november 2026, direct na de uitrol van
       0055 (de CHECK zelf komt uit 0054). De semantiekronde meldde:

         uitspraken bekeken 84, verrijkt 33, mislukt 38
         new row for relation "uitspraken" violates check constraint
         "uitspraken_vorm_vereist_passage"

       Fail-closed, dus er is niets fouts weggeschreven — maar 38 van de
       84 claims bleven onverrijkt. De CHECK staat in migratie 0054.

       DE OORZAAK. Een afgeleide LOSSE_DATUM is een ROL met een LEGE
       passage: bepaalDatumrol() geeft bij een losse datum bewust
       `passage: ""`, want er is geen fragment dat de rol aanwijst. Deze
       regel schreef dan `datumrol = 'LOSSE_DATUM'` met
       `bronpassage = null`, en dat is precies de combinatie die 0054
       weigert.

       EN DE EXTRACTIEWEG DEED HET AL GOED. zoekDatums() in
       uitspraken.ts zet bij een te korte passage ALLE TWEE op null:

         ...(rol.passage.length >= 10
               ? { bronpassage: rol.passage }
               : { datumrol: null, bronpassage: null })

       Twee schrijvers naar dezelfde kolommen, en maar één kende de
       regel. Dat is dezelfde klasse fout die deze repo bij SCHAAL in
       uitspraken.ts en bij de dedupsleutel al heeft betaald, nu tussen
       de extractie en de verrijking.

       WAT LOSSE_DATUM DAARMEE WORDT, en dit is NAGEMETEN en niet
       beredeneerd — mijn eerste versie van dit commentaar beschreef
       hier een uitkomst die de code niet geeft, en vier onafhankelijke
       lezingen van PR #73 hebben dat weerlegd.

       Met rol en passage beide null komt de claim bij vormpoort() niet
       bij tak 8 (de datumrolcontrole) maar bij CONTROLE 2, de
       passage-eis. Gemeten op de zin van toets 11b:

         datumrol    null
         bronpassage null
         uitslag     VERIFICATIE_NODIG
         reden       "er is geen concrete bronpassage van minstens tien
                      tekens vastgelegd (nu 0). Zonder aanwijsbaar
                      fragment is niet na te gaan waarop dit oordeel
                      rust."

       Dus NIET 'CONTEXT_ONVOLLEDIG' met "een losse datum is niet
       automatisch een verwoordbare claim" — die reden hoort bij een
       rij die een rol WEL draagt, en die rij maakt deze weg niet meer.

       EN DAT HEEFT EEN PRIJS DIE HIER HOORT TE STAAN. Na deze reparatie
       kan GEEN ENKEL codepad de waarde datumrol='LOSSE_DATUM' nog
       wegschrijven: zoekDatums() zette hem al op null bij een korte
       passage, en deze regel doet dat nu ook. De kolom onderscheidt
       daarmee niet langer "we hebben gekeken en het is een losse datum"
       van "we hebben niet gekeken" — het ontwerpuitgangspunt in
       datumrol.ts en in 0054 dat LOSSE_DATUM "een uitkomst en geen
       leegte" is, geldt nog voor de pure motor maar niet meer voor de
       opslag. Waar de uitkomst WEL staat, is `verwoordbaar` plus
       `verwoordbaar_reden`, en die reden noemt de ontbrekende passage.

       Dat is een bewuste afweging en geen vergissing: het alternatief
       is uitspraken_vorm_vereist_passage oprekken voor LOSSE_DATUM, en
       dat verzwakt een grendel om een schrijffout te verbergen.

       DE CONSTRAINT IS NIET VERRUIMD. Hij staat in migratie 0054 (niet
       0055) en is ongewijzigd. */
    const rolEnPassage: { rol: Datumrol | null; passage: string | null } =
      vastgelegdeRol !== null && vastgelegdePassage !== null
        ? { rol: vastgelegdeRol, passage: vastgelegdePassage }
        : afgeleidePassage !== null
          ? { rol: vastgelegdeRol ?? afgeleideRol, passage: afgeleidePassage }
          : { rol: null, passage: null };
    const gebruikteRol = rolEnPassage.rol;
    const passage = rolEnPassage.passage;
    const invoer = {
      vorm: null,
      datumrol: gebruikteRol,
      datumBetreft: rol.betreft,
      tijdstand: null,
      geldigVanaf: null as string | null,
      geldigTot: null as string | null,
      uitgever: rij.uitgever,
    };
    const poort = vormpoort({
      vorm: null,
      datumrol: gebruikteRol,
      datumBetreft: rol.betreft,
      passage,
      tijdstand: null,
      modaliteit: (rij.modaliteit ?? null) as Modaliteit | null,
      modaliteitZekerheid:
        rij.modaliteit_zekerheid == null ? null : Number(rij.modaliteit_zekerheid),
      verificatieStatus: rij.verificatie_status,
      heeftBewijs: rij.heeft_bewijs,
      vervangenDoor:
        rij.vervangen_door !== null
          ? { id: rij.vervangen_door, soort: rij.vervangen_soort ?? "onbekend" }
          : null,
      dagenOud: rij.dagen_oud,
      houdbaarheidDagen: HOUDBAARHEID_DAGEN["datum"] ?? null,
      magCiteren: rij.mag_citeren,
      toepassingsgebied: jur.gebied,
      toepassingsgebiedGrondslag: gebiedGrondslag,
      /* DE ZIN WORDT HIER GEMAAKT MET DE GELDIGHEIDSDATUMS UIT DE
         DATABASE, en die staan niet in SemantiekRij. De poort toetst
         daarom of er een zin te maken IS met de velden die hij kent;
         schrijfVormSemantiek() maakt hem met de echte datums. Zou de
         zin daar alsnog null zijn, dan weigert
         uitspraken_verwoordbaar_heeft_zin de rij — fail-closed, en
         zichtbaar in het logboek. */
      /* ZONDER ROL IS ER GEEN ZIN. Een losse datum komt hier met
         gebruikteRol null binnen; vormpoort.ts geeft dan
         VERIFICATIE_NODIG met de reden dat er noch een vorm noch een rol
         is. De uitkomst blijft dus zichtbaar en navolgbaar. */
      kanVerwoorden: () =>
        gebruikteRol !== null && gebruikteRol !== "LOSSE_DATUM" && rol.betreft !== null,
    });
    void invoer;
    return {
      id: rij.id,
      semantiekSoort: "datum",
      claimvorm: null,
      datumrol: gebruikteRol,
      tijdstand: null,
      bronpassage: passage,
      betreft: rol.betreft,
      toepassingsgebied: jur.gebied,
      toepassingsgebiedGrondslag: gebiedGrondslag,
      uitslag: poort.uitslag,
      reden: poort.reden,
      zin: null,
    };
  }

  /* ---------- DE VORMROUTE ---------- */
  const vormen = leesVormClaims(rij.tekst);
  /* WELKE VORM HOORT BIJ DEZE RIJ. Eén zin kan meer vormen dragen, en
     dan staan er in de database ook meer claims — één per vorm. Staat de
     vorm al vastgelegd, dan is dat de juiste; anders is er maar iets te
     kiezen als de soort het aanwijst, en dat doet hij niet eenduidig
     (BESLUIT, VERPLICHTING en INWERKINGTREDING hebben alle drie soort
     'regel'). Zonder vastgelegde vorm EN met meer dan één kandidaat is
     de koppeling niet vast te stellen, en dan wordt er niets gekozen. */
  const vastgelegd = (rij.claimvorm ?? null) as Claimvorm | null;
  const kandidaten = vormen.filter((v) => v.soort === rij.soort);
  const gekozen =
    vastgelegd !== null
      ? (vormen.find((v) => v.vorm === vastgelegd) ?? null)
      : kandidaten.length === 1
        ? (kandidaten[0] ?? null)
        : null;
  if (gekozen === null) return null;

  const passage = rij.bronpassage ?? gekozen.passage;
  const tijdstand = ((rij.tijdstand ?? null) as Tijdstand | null) ?? gekozen.tijdstand;

  const verwoordInvoer = {
    vorm: gekozen.vorm,
    datumrol: null,
    datumBetreft: gekozen.betreft,
    tijdstand,
    geldigVanaf: null,
    geldigTot: null,
    uitgever: rij.uitgever,
  };

  const poort = vormpoort({
    vorm: gekozen.vorm,
    datumrol: null,
    datumBetreft: gekozen.betreft,
    passage,
    tijdstand,
    modaliteit: (rij.modaliteit ?? null) as Modaliteit | null,
    modaliteitZekerheid:
      rij.modaliteit_zekerheid == null ? null : Number(rij.modaliteit_zekerheid),
    verificatieStatus: rij.verificatie_status,
    heeftBewijs: rij.heeft_bewijs,
    vervangenDoor:
      rij.vervangen_door !== null
        ? { id: rij.vervangen_door, soort: rij.vervangen_soort ?? "onbekend" }
        : null,
    dagenOud: rij.dagen_oud,
    houdbaarheidDagen: HOUDBAARHEID_DAGEN[gekozen.semantiekSoort] ?? null,
    magCiteren: rij.mag_citeren,
    toepassingsgebied: jur.gebied,
    toepassingsgebiedGrondslag: gebiedGrondslag,
    kanVerwoorden: () => verwoordVorm(verwoordInvoer) !== null,
  });

  return {
    id: rij.id,
    semantiekSoort: gekozen.semantiekSoort,
    claimvorm: gekozen.vorm,
    datumrol: null,
    tijdstand,
    bronpassage: passage,
    betreft: gekozen.betreft,
    toepassingsgebied: jur.gebied,
    toepassingsgebiedGrondslag: gebiedGrondslag,
    uitslag: poort.uitslag,
    reden: poort.reden,
    zin: poort.uitslag === "VERWOORDBAAR" ? verwoordVorm(verwoordInvoer) : null,
  };
}

function factorVan(schaalwoord: string): number {
  const t: Record<string, number> = {
    duizend: 1e3,
    mille: 1e3,
    miljoen: 1e6,
    mln: 1e6,
    miljard: 1e9,
    mld: 1e9,
    biljoen: 1e12,
  };
  return t[schaalwoord] ?? 1;
}

/** De query die alles ophaalt wat de verrijking nodig heeft. */
const LEESQUERY = `
  select u.id, u.gebeurtenis_id, u.tekst, u.soort, u.waarde_numeriek, u.eenheid,
         u.onderwerp, u.verificatie_status, u.bewijs_kwaliteit, u.semantiek_soort,
         u.claimvorm, u.datumrol, u.tijdstand, u.bronpassage,
         u.modaliteit, u.modaliteit_zekerheid,
         exists (select 1 from intel.uitspraak_bronnen ub
                  where ub.uitspraak_id = u.id and ub.rol = 'primair') as heeft_bewijs,
         coalesce(bool_and(b.mag_citeren), false) as mag_citeren,
         -- Nodig voor regel 7 van de jurisdictie: een tekst ZONDER
         -- gebiedssignaal wordt alleen Nederlands als de uitgever een
         -- Nederlandse autoriteit is EN de bron primair. Zonder dit veld
         -- kan de poort per definitie geen gebied beslissen.
         coalesce(bool_or(b.is_primaire_bron), false) as is_primaire_bron,
         min(extract(day from (now() - d.gepubliceerd_op)))::int as dagen_oud,
         min(d.uitgever) as uitgever,
         min(d.gepubliceerd_op)::date::text as brondatum,
         (select c.vervanger_id from intel.uitspraak_correcties c
           where c.vervangen_id = u.id order by c.vastgesteld_op desc limit 1) as vervangen_door,
         (select c.soort from intel.uitspraak_correcties c
           where c.vervangen_id = u.id order by c.vastgesteld_op desc limit 1) as vervangen_soort
    from intel.uitspraken u
    left join intel.uitspraak_bronnen ub2 on ub2.uitspraak_id = u.id
    left join intel.brondocument_versies v on v.id = ub2.versie_id
    left join intel.brondocumenten d on d.id = v.brondocument_id
    left join intel.bronnen b on b.id = d.bron_id
   where u.organisatie_id = $1
     and u.id > $2
     %FILTER%
   group by u.id
   order by u.id
   limit $3`;

export type BackfillRapport = {
  readonly bekeken: number;
  readonly verrijkt: number;
  readonly onveranderd: number;
  readonly zonderUitdrukking: number;
  readonly perUitslag: Readonly<Record<string, number>>;
  readonly laatsteId: number;
};

/**
 * Vult de semantiek bij voor bestaande uitspraken.
 *
 * `vanafId` maakt hem hervatbaar; `alles` doet ook de rijen die al een
 * semantiek_soort hebben, nodig na een wijziging in het vocabulaire.
 */
export async function backfillSemantiek(
  pool: Pool,
  organisatieId: number,
  opties: { vanafId?: number; max?: number; alles?: boolean; droog?: boolean } = {},
): Promise<BackfillRapport> {
  const vanaf = opties.vanafId ?? 0;
  const max = opties.max ?? 500;
  /* WAT 'NOG NIET GEDAAN' BETEKENT.
     De eerste versie zocht alleen op `semantiek_soort is null`: nog geen
     semantiek afgeleid. Een uitspraak die WEL semantiek heeft maar nog
     geen verwoordbaarheidsoordeel viel daarmee buiten de backfill, en
     dat is precies de uitspraak die uit de schaalcorrectie komt: de
     semantiek is overgenomen, het oordeel is bewust leeggelaten omdat
     de waarde veranderde. Zonder deze tweede voorwaarde kreeg zo'n
     gecorrigeerde uitspraak nooit een zin en bleef de reparatie zonder
     effect. Niet af is: geen semantiek OF geen oordeel. */
  const filter = opties.alles ? "" : "and (u.semantiek_soort is null or u.verwoordbaar is null)";

  const rijenUit = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<SemantiekRij>(c, LEESQUERY.replace("%FILTER%", filter), [organisatieId, vanaf, max]),
  );

  const perUitslag: Record<string, number> = {};
  let verrijkt = 0;
  let onveranderd = 0;
  let zonderUitdrukking = 0;
  let laatsteId = vanaf;

  for (const rij of rijenUit) {
    laatsteId = rij.id;
    const v = verrijk(rij);
    if (!v) {
      /* GEEN GETALUITDRUKKING IS NIET HETZELFDE ALS NIETS TE DOEN.
         ----------------------------------------------------------------
         Hier stopte de ronde: `zonderUitdrukking += 1; continue;`. Dat
         is de reden dat de 39 datumclaims in productie op 6 november
         2026 alle 39 onbeoordeeld stonden — ze hebben geen
         `waarde_numeriek`, dus verrijk() gaf null en de rij bleef
         liggen.

         De vormroute kijkt nu naar diezelfde rij met een andere vraag:
         draagt deze zin een BESLUIT, een VERPLICHTING, een
         INWERKINGTREDING, een SUBSIDIEVENSTER, een CONGESTIESTATUS, een
         PROJECTSTATUS, een SPECIFICATIE, een BELEIDSWIJZIGING of een
         datum met een rol? Zo ja, dan gaat hij door vormpoort.ts.

         DE GETALROUTE IS ONGEWIJZIGD. Deze tak wordt alleen bereikt als
         verrijk() null gaf, dus geen enkele getalclaim verandert van
         route of van oordeel. */
      const vv = verrijkVorm(rij);
      if (!vv) {
        zonderUitdrukking += 1;
        continue;
      }
      perUitslag[vv.uitslag] = (perUitslag[vv.uitslag] ?? 0) + 1;
      if (opties.droog) {
        verrijkt += 1;
        continue;
      }
      try {
        await metOrganisatie(pool, { organisatieId }, (c) =>
          schrijfVormSemantiek(c, organisatieId, vv),
        );
        verrijkt += 1;
      } catch (e) {
        log.fout("vormsemantiek wegschrijven mislukt", { uitspraak: rij.id, fout: e });
        onveranderd += 1;
      }
      continue;
    }
    perUitslag[v.uitslag] = (perUitslag[v.uitslag] ?? 0) + 1;

    if (opties.droog) {
      verrijkt += 1;
      continue;
    }

    try {
      await metOrganisatie(pool, { organisatieId }, (c) => schrijfSemantiek(c, organisatieId, v));
      verrijkt += 1;
    } catch (e) {
      log.fout("semantiek wegschrijven mislukt", { uitspraak: rij.id, fout: e });
      onveranderd += 1;
    }
  }

  return {
    bekeken: rijenUit.length,
    verrijkt,
    onveranderd,
    zonderUitdrukking,
    perUitslag,
    laatsteId,
  };
}

/**
 * Schrijft de vorm- of datumsemantiek weg.
 *
 * DRIE DINGEN DIE HIJ NIET DOET, en elk daarvan is een regel uit de kop
 * van dit bestand:
 *
 *   - hij raakt `waarde_numeriek`, `eenheid`, `uitdrukking`, `exactheid`,
 *     `bereik_min`, `bereik_max` en `schaalwoord` NIET aan. Die velden
 *     horen bij de getalroute; een vormclaim heeft er niets te zoeken.
 *   - hij verhoogt geen verificatiestatus.
 *   - hij overschrijft een al vastgelegde claimvorm, datumrol, tijdstand
 *     of bronpassage NIET: `coalesce(bestaand, nieuw)`. Wat er al staat
 *     is door een eerdere ronde of door een mens gezet.
 *
 * DE ZIN WORDT HIER OPNIEUW GEMAAKT, met de echte geldigheidsdatums uit
 * de database erbij. verrijkVorm() kent die niet (ze staan niet in
 * SemantiekRij) en toetst daarom alleen of er een zin te maken IS.
 * Levert dit alsnog niets op terwijl de uitslag VERWOORDBAAR is, dan
 * wordt de uitslag teruggezet op CONTEXT_ONVOLLEDIG — fail-closed, in
 * plaats van de database laten weigeren op
 * uitspraken_verwoordbaar_heeft_zin.
 */
export async function schrijfVormSemantiek(
  c: pg.PoolClient,
  organisatieId: number,
  v: VormVerrijking,
): Promise<void> {
  const huidig = await c.query<{
    geldig_vanaf: string | null;
    geldig_tot: string | null;
    uitgever: string | null;
  }>(
    `select u.geldig_vanaf::text as geldig_vanaf, u.geldig_tot::text as geldig_tot,
            min(d.uitgever) as uitgever
       from intel.uitspraken u
       left join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
       left join intel.brondocument_versies bv on bv.id = ub.versie_id
       left join intel.brondocumenten d on d.id = bv.brondocument_id
      where u.organisatie_id = $1 and u.id = $2
      group by u.id, u.geldig_vanaf, u.geldig_tot`,
    [organisatieId, v.id],
  );
  const r = huidig.rows[0];

  const zin =
    v.uitslag === "VERWOORDBAAR"
      ? verwoordVorm({
          vorm: v.claimvorm,
          datumrol: v.datumrol,
          datumBetreft: v.betreft,
          tijdstand: v.tijdstand,
          geldigVanaf: r?.geldig_vanaf ?? null,
          geldigTot: r?.geldig_tot ?? null,
          uitgever: r?.uitgever ?? null,
        })
      : null;

  /* FAIL-CLOSED. uitspraken_verwoordbaar_heeft_zin eist 25 tekens; een
     kortere of ontbrekende zin is geen reden om de constraint te laten
     vuren maar om de uitslag eerlijk te verlagen. */
  const uitslag =
    v.uitslag === "VERWOORDBAAR" && (zin === null || zin.length < 25)
      ? "CONTEXT_ONVOLLEDIG"
      : v.uitslag;
  const reden =
    uitslag === v.uitslag
      ? v.reden
      : `alle poortcontroles zijn gehaald, maar er komt met de vastgelegde datums geen ` +
        `Nederlandse zin van minstens 25 tekens uit (nu: ${zin === null ? "geen zin" : `${zin.length} tekens`}). ` +
        `Dat is een gat in de verwoorder, niet in het bewijs.`;

  await c.query(
    `update intel.uitspraken
        set semantiek_soort     = $3,
            claimvorm           = coalesce(claimvorm, $4),
            datumrol            = coalesce(datumrol, $5),
            tijdstand           = coalesce(tijdstand, $6),
            bronpassage         = coalesce(bronpassage, $7),
            grondtal            = coalesce(grondtal, $8),
            toepassingsgebied   = $9,
            toepassingsgebied_grondslag = $10,
            verwoorde_zin       = $11,
            verwoordbaar        = $12,
            verwoordbaar_reden  = $13,
            verwoordbaar_op     = now(),
            semantiek_herkomst  = 'bron_patroon',
            semantiek_op        = now()
      where organisatie_id = $1 and id = $2`,
    [
      organisatieId,
      v.id,
      v.semantiekSoort,
      v.claimvorm,
      v.datumrol,
      v.tijdstand,
      v.bronpassage,
      /* `grondtal` draagt hier WAT de claim betreft. Geen nieuwe kolom:
         uitspraken_kwalitatief_heeft_onderwerp vraagt al naar fenomeen
         of subject, en `grondtal` is het veld dat de verwoorder voor
         "van wat" gebruikt. Alleen vullen als hij leeg is. */
      v.betreft,
      v.toepassingsgebied,
      /* uitspraken_gebied_heeft_grondslag eist 15 tekens zodra er een
         gebied staat. Een lege grondslag zou de rij laten weigeren; de
         jurisdictiemotor geeft altijd een regel, maar niet altijd een
         lange, dus hier een expliciete ondergrens met de uitslag erin. */
      v.toepassingsgebiedGrondslag.length >= 15
        ? v.toepassingsgebiedGrondslag
        : `toepassingsgebied ${v.toepassingsgebied} bepaald zonder expliciet gebiedssignaal in de bronzin`,
      zin,
      uitslag,
      reden.length >= 15 ? reden : `${reden} (geen nadere grondslag vastgelegd)`,
    ],
  );
}

/**
 * Schrijft de semantiek weg.
 *
 * RAAKT DE WAARDE NIET AAN. `waarde_numeriek` blijft staan zoals hij is,
 * ook als de uitdrukking een andere waarde suggereert. Een backfill die
 * waarden herschrijft zou een correctie zijn, en die hoort via
 * intel.uitspraak_correcties te gaan zodat de geschiedenis blijft staan.
 * Wat de backfill WEL doet is de poort laten zien dat er iets niet
 * rijmt: dan komt er VERIFICATIE_NODIG uit.
 */
export async function schrijfSemantiek(
  c: pg.PoolClient,
  organisatieId: number,
  v: Verrijking,
): Promise<void> {
  await c.query(
    `update intel.uitspraken
        set semantiek_soort     = $3,
            fenomeen            = $4,
            subject             = $5,
            richting            = $6,
            grondtal            = $7,
            uitdrukking         = $8,
            exactheid           = $9,
            bereik_min          = $10,
            bereik_max          = $11,
            schaalwoord         = $12,
            periode             = $13,
            horizon             = $20,
            toepassingsgebied   = $21,
            toepassingsgebied_grondslag = $22,
            bron_vindplaats     = $14,
            verwoorde_zin       = $18,
            scope_waarschuwing  = $19,
            verwoordbaar        = $15,
            verwoordbaar_reden  = $16,
            verwoordbaar_op     = now(),
            semantiek_herkomst  = $17,
            semantiek_op        = now()
      where organisatie_id = $1 and id = $2`,
    [
      organisatieId,
      v.id,
      v.semantiek.soort,
      v.semantiek.fenomeen,
      v.semantiek.subject,
      v.semantiek.richting,
      v.semantiek.grondtal,
      v.uitdrukking.uitdrukking,
      v.uitdrukking.exactheid,
      v.uitdrukking.bereikMin,
      v.uitdrukking.bereikMax,
      v.uitdrukking.schaalwoord,
      v.semantiek.periode,
      `tekenpositie ${v.uitdrukking.positie}`,
      v.uitslag,
      v.reden.slice(0, 2000),
      v.semantiek.herkomst,
      v.zin,
      v.semantiek.scopeWaarschuwing,
      v.semantiek.horizon,
      v.semantiek.toepassingsgebied,
      /* De database eist >= 15 tekens zodra het gebied staat (0038).
         jurisdictie.ts geeft altijd minstens een regel, ook bij
         ONBEKEND, dus dit is geen lege vangnettekst maar de gemeten
         grondslag. */
      v.semantiek.toepassingsgebiedGrondslag,
    ],
  );
}

/* ------------------------------------------------------------------
   TEGENSPRAAK EN OPVOLGING
   ------------------------------------------------------------------ */

export type CorrectieRapport = {
  readonly bekeken: number;
  readonly vastgelegd: number;
  readonly perSoort: Readonly<Record<string, number>>;
};

/**
 * Zoekt uitspraken die door een nieuwere zijn vervangen.
 *
 * DE REGEL: zelfde fenomeen, zelfde subject, zelfde eenheid, en een
 * nieuwere bron. Dan beschrijft de nieuwere de stand van zaken en is de
 * oudere achterhaald.
 *
 * NIETS WORDT OVERSCHREVEN. De oudere rij blijft staan; er komt een
 * regel in intel.uitspraak_correcties bij. Par. 9 en 19 vragen dat
 * expliciet, en het is ook de enige manier om later te kunnen zien wat
 * er wanneer gold.
 */
export async function vindCorrecties(
  pool: Pool,
  organisatieId: number,
  opties: { droog?: boolean } = {},
): Promise<CorrectieRapport> {
  const paren = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      oud_id: number;
      nieuw_id: number;
      fenomeen: string;
      oud_waarde: string | null;
      nieuw_waarde: string | null;
      oud_datum: string | null;
      nieuw_datum: string | null;
      dagen: number | null;
    }>(
      c,
      `with met_datum as (
         select u.id, u.fenomeen, u.subject, u.eenheid, u.waarde_numeriek,
                u.toepassingsgebied,
                min(d.gepubliceerd_op) as brondatum
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
           join intel.brondocument_versies v on v.id = ub.versie_id
           join intel.brondocumenten d on d.id = v.brondocument_id
          where u.organisatie_id = $1
            and u.fenomeen is not null
            and u.verificatie_status = 'bevestigd'
          group by u.id, u.fenomeen, u.subject, u.eenheid, u.waarde_numeriek,
                   u.toepassingsgebied)
       select o.id as oud_id, n.id as nieuw_id, o.fenomeen,
              o.waarde_numeriek::text as oud_waarde, n.waarde_numeriek::text as nieuw_waarde,
              o.brondatum::date::text as oud_datum, n.brondatum::date::text as nieuw_datum,
              extract(day from (n.brondatum - o.brondatum))::int as dagen
         from met_datum o
         join met_datum n
           on n.fenomeen = o.fenomeen
          and coalesce(n.subject,'') = coalesce(o.subject,'')
          and coalesce(n.eenheid,'') = coalesce(o.eenheid,'')
          -- HET GEBIED HOORT IN DE SLEUTEL. Zonder deze regel kan een
          -- Belgisch nettarief een Nederlands nettarief als 'vervangen'
          -- markeren, waarna de poort op de NEDERLANDSE uitspraak
          -- VEROUDERD geeft. Het goede feit sneuvelt dan en het
          -- verkeerde blijft staan. Een onbepaald gebied vervangt niets
          -- en wordt door niets vervangen: coalesce op een sentinel die
          -- nooit aan zichzelf gelijk is, kan niet in SQL, dus de
          -- vergelijking eist dat BEIDE gebieden bekend en gelijk zijn.
          and n.toepassingsgebied is not null
          and o.toepassingsgebied is not null
          and n.toepassingsgebied = o.toepassingsgebied
          and n.brondatum > o.brondatum
          and n.id <> o.id
        -- Alleen de EERSTVOLGENDE nieuwere; anders ketent elke oudere
        -- aan elke nieuwere en krijg je een kruisproduct.
        where not exists (
          select 1 from met_datum tussen
           where tussen.fenomeen = o.fenomeen
             and coalesce(tussen.subject,'') = coalesce(o.subject,'')
             and coalesce(tussen.eenheid,'') = coalesce(o.eenheid,'')
             and tussen.toepassingsgebied = o.toepassingsgebied
             and tussen.brondatum > o.brondatum
             and tussen.brondatum < n.brondatum)
          and not exists (
            select 1 from intel.uitspraak_correcties c
             where c.vervangen_id = o.id and c.vervanger_id = n.id)
        order by o.id`,
      [organisatieId],
    ),
  );

  const perSoort: Record<string, number> = {};
  let vastgelegd = 0;

  for (const p of paren) {
    /* Dezelfde waarde is geen correctie maar een herhaling. */
    if (p.oud_waarde !== null && p.oud_waarde === p.nieuw_waarde) continue;

    const soort = p.fenomeen === "nettarief" || p.fenomeen === "subsidiebudget"
      ? "statistiek_herzien"
      : "statistiek_herzien";
    perSoort[soort] = (perSoort[soort] ?? 0) + 1;
    if (opties.droog) {
      vastgelegd += 1;
      continue;
    }
    await metOrganisatie(pool, { organisatieId }, (c) =>
      c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1,$2,$3,$4,$5)
         on conflict (vervangen_id, vervanger_id) do nothing`,
        [
          organisatieId,
          p.oud_id,
          p.nieuw_id,
          soort,
          `zelfde fenomeen '${p.fenomeen}' met dezelfde eenheid, maar uitspraak ${p.nieuw_id} ` +
            `komt uit een bron van ${p.nieuw_datum} en uitspraak ${p.oud_id} uit ${p.oud_datum} ` +
            `(${p.dagen} dagen eerder). De waarde ging van ${p.oud_waarde} naar ${p.nieuw_waarde}. ` +
            `De nieuwere beschrijft de stand van zaken; de oudere blijft staan als geschiedenis.`,
        ],
      ),
    );
    vastgelegd += 1;
  }

  return { bekeken: paren.length, vastgelegd, perSoort };
}
