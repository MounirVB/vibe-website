/* ============================================================
   PIJPLIJN — één Nederlandse zin uit een VORM- of DATUMclaim
   ------------------------------------------------------------
   DEZELFDE REGEL ALS IN verwoord.ts: de zin wordt uitsluitend uit
   VASTGELEGDE VELDEN gebouwd. De bronpassage gaat er NIET in.

   Dat is geen stijlkeuze. De passage is het bewijs dat de claim deze
   vorm heeft; zodra hij in de gepubliceerde zin belandt, citeren we de
   bron — wat bij mag_citeren=false niet mag, en wat bij een
   auteursrechtelijk beschermde tekst ook niet hoort. En een zin die
   een brokstuk brontekst meeneemt, neemt ook de formulering van de
   bron mee, inclusief wat die bron suggereert maar niet zegt.

   Daarom: elk woord in de uitkomst komt uit een gesloten tabel in dit
   bestand, uit `betreft` (zelf een gesloten vocabulaire in datumrol.ts),
   uit de uitgeversnaam of uit een datum. Niets anders.

   GEEFT null TERUG ALS ER GEEN ZIN TE MAKEN IS. Dat is het antwoord en
   geen tekortkoming: vormpoort.ts toetst het als laatste controle, en
   uitspraken_verwoordbaar_heeft_zin in de database eist een zin van 25
   tekens. Een null hier betekent dus CONTEXT_ONVOLLEDIG daar, nooit
   een geweigerde rij.
   ============================================================ */

import type { Claimvorm, Tijdstand } from "./claimvorm.ts";
import type { Datumrol } from "./datumrol.ts";
import { datumInWoorden } from "./verwoord.ts";

/* ------------------------------------------------------------------
   DE ACHT VORMEN IN WOORDEN

   `kop` is wat er is vastgesteld, `vraagtOnderwerp` zegt of de zin
   zonder onderwerp onvolledig is. Een CONGESTIESTATUS zonder gebied is
   nog steeds een bewering ("er is congestie vastgesteld"); een
   SUBSIDIEVENSTER zonder regeling is dat niet ("er is een
   aanvraagperiode" — van wat?).
   ------------------------------------------------------------------ */
const VORM_ZINSVORM: Readonly<
  Record<Claimvorm, { readonly kop: string; readonly vraagtOnderwerp: boolean }>
> = {
  BESLUIT: { kop: "is er een besluit genomen", vraagtOnderwerp: false },
  VERPLICHTING: { kop: "geldt er een verplichting", vraagtOnderwerp: false },
  INWERKINGTREDING: { kop: "treedt een regel in werking", vraagtOnderwerp: false },
  SUBSIDIEVENSTER: { kop: "is er een aanvraagperiode", vraagtOnderwerp: true },
  CONGESTIESTATUS: { kop: "is er een congestietoestand vastgesteld", vraagtOnderwerp: false },
  PROJECTSTATUS: { kop: "is de stand van een project gewijzigd", vraagtOnderwerp: false },
  SPECIFICATIE: { kop: "gelden er technische specificaties", vraagtOnderwerp: false },
  BELEIDSWIJZIGING: { kop: "is beleid of uitvoering gewijzigd", vraagtOnderwerp: false },
};

/* ------------------------------------------------------------------
   DE TIJDSTAND IN WOORDEN — en dit is waar de opdracht om vraagt.

   "Aangekondigd ≠ in werking" is alleen waar als een lezer het
   VERSCHIL in de zin terugziet. Vandaar vier verschillende
   formuleringen in plaats van één met een voetnoot.
   ------------------------------------------------------------------ */
const TIJDSTAND_ZINSVORM: Readonly<Record<Tijdstand, string | null>> = {
  IN_WERKING: "die nu van kracht is",
  AANGEKONDIGD: "die is aangekondigd en nog niet van kracht",
  VERLOPEN: "die niet langer van kracht is",
  TIJDELIJK: "die tijdelijk van kracht is",
  /* ONBEPAALD krijgt geen woorden. Een zin die de toestand verzwijgt is
     beter dan een zin die hem aanneemt — en voor de vier vormen waar de
     toestand de bewering draagt, laat vormpoort.ts ONBEPAALD niet eens
     door. */
  ONBEPAALD: null,
};

const DATUMROL_ZINSVORM: Readonly<Record<Datumrol, string | null>> = {
  AANVRAAGPERIODE: "de aanvraagperiode",
  STARTDATUM: "de ingangsdatum",
  EINDDATUM: "de einddatum",
  PUBLICATIEDATUM: "de publicatiedatum",
  VERWACHTE_DATUM: "de verwachte datum",
  /* Een losse datum krijgt geen zin, en dat is de regel uit de
     opdracht. Hij staat hier óók, en niet alleen in de poort: twee
     onafhankelijke lagen die hetzelfde weigeren. */
  LOSSE_DATUM: null,
};

export type VormVerwoordInvoer = {
  readonly vorm: Claimvorm | null;
  readonly datumrol: Datumrol | null;
  /**
   * WAT de claim betreft, uit herkenBetreft() in datumrol.ts. Geldt
   * voor beide routes: een datum zonder onderwerp is geen bewering, en
   * een aanvraagperiode zonder regeling net zo min.
   */
  readonly datumBetreft: string | null;
  readonly tijdstand: Tijdstand | null;
  readonly geldigVanaf: string | null;
  readonly geldigTot: string | null;
  readonly uitgever: string | null;
};

/**
 * Bouwt één zin, of geeft null.
 *
 * DE ZIN NOEMT ALTIJD ZIJN BRON. 'Volgens X' is geen hoffelijkheid maar
 * de enige manier waarop een lezer kan zien dat dit een weergave is en
 * geen eigen vaststelling van Vibe Energy.
 */
export function verwoordVorm(inv: VormVerwoordInvoer): string | null {
  const bron = inv.uitgever ? `Volgens ${inv.uitgever}` : "Volgens de bron";

  /* ---------- DATUMCLAIM ---------- */
  if (inv.datumrol !== null) {
    const rolWoorden = DATUMROL_ZINSVORM[inv.datumrol];
    if (rolWoorden === null) return null;
    if (!inv.datumBetreft) return null;

    /* WELKE DATUM HOORT BIJ WELKE ROL. Een einddatum die uit
       geldig_vanaf zou worden gelezen, zou de bewering omkeren. Daarom
       per rol vastleggen welk veld hem draagt, en bij een ontbrekend
       veld geen zin maken. */
    const datum =
      inv.datumrol === "EINDDATUM"
        ? datumInWoorden(inv.geldigTot)
        : inv.datumrol === "AANVRAAGPERIODE"
          ? datumInWoorden(inv.geldigVanaf) ?? datumInWoorden(inv.geldigTot)
          : datumInWoorden(inv.geldigVanaf) ?? datumInWoorden(inv.geldigTot);
    if (!datum) return null;

    if (inv.datumrol === "AANVRAAGPERIODE") {
      const van = datumInWoorden(inv.geldigVanaf);
      const tot = datumInWoorden(inv.geldigTot);
      if (van && tot) {
        return `${bron} loopt de aanvraagperiode van ${inv.datumBetreft} van ${van} tot ${tot}.`;
      }
      return `${bron} is ${datum} een datum in de aanvraagperiode van ${inv.datumBetreft}.`;
    }
    if (inv.datumrol === "PUBLICATIEDATUM") {
      return `${bron} is ${inv.datumBetreft} gepubliceerd op ${datum}.`;
    }
    if (inv.datumrol === "VERWACHTE_DATUM") {
      return `${bron} is ${datum} de verwachte datum voor ${inv.datumBetreft}; die datum staat nog niet vast.`;
    }
    if (inv.datumrol === "EINDDATUM") {
      return `${bron} is ${datum} de einddatum van ${inv.datumBetreft}.`;
    }
    return `${bron} is ${datum} de ingangsdatum van ${inv.datumBetreft}.`;
  }

  /* ---------- VORMCLAIM ---------- */
  if (inv.vorm === null) return null;
  const vormWoorden = VORM_ZINSVORM[inv.vorm];
  if (!vormWoorden) return null;

  const toestand =
    inv.tijdstand === null ? null : TIJDSTAND_ZINSVORM[inv.tijdstand];
  /* De vier vormen waar de toestand de bewering draagt, komen hier
     alleen langs met een bekende tijdstand — vormpoort.ts weigert
     ONBEPAALD daar. Deze controle is de dubbele bodem: zou iemand deze
     functie zonder poort aanroepen, dan komt er geen zin uit in plaats
     van een zin die de toestand verzwijgt. */
  const toestandNodig =
    inv.vorm === "BESLUIT" ||
    inv.vorm === "VERPLICHTING" ||
    inv.vorm === "INWERKINGTREDING" ||
    inv.vorm === "SUBSIDIEVENSTER";
  if (toestandNodig && !toestand) return null;

  const datum =
    datumInWoorden(inv.geldigVanaf) !== null
      ? ` per ${datumInWoorden(inv.geldigVanaf)}`
      : "";

  const staart = toestand ? ` ${toestand}` : "";

  if (vormWoorden.vraagtOnderwerp) {
    /* Een SUBSIDIEVENSTER zonder regeling is geen bewering: "er is een
       aanvraagperiode" — van wat? `betreft` is het enige kanaal
       waarlangs het onderwerp binnenkomt, en dat kanaal verzint niets:
       herkenBetreft() geeft null zodra de bronzin niets herkenbaars
       noemt. */
    if (!inv.datumBetreft) return null;
    return `${bron} ${vormWoorden.kop} voor ${inv.datumBetreft}${datum}${staart}.`;
  }

  /* HET ONDERWERP ERBIJ ALS DE BRON HET NOEMT, en anders niet. Een zin
     die het onderwerp weglaat is smaller dan de bron en daarmee veilig;
     een zin die er een verzint is breder en daarmee onwaar. */
  const over = inv.datumBetreft ? ` over ${inv.datumBetreft}` : "";
  return `${bron} ${vormWoorden.kop}${over}${datum}${staart}.`;
}
