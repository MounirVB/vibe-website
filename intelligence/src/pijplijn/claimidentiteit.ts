/* ============================================================
   PIJPLIJN — de CANONIEKE IDENTITEIT van een claim
   ------------------------------------------------------------
   HET GEMETEN GEVAL, 6 november 2026.

   De dedupsleutel in schrijfUitspraken() bevat `versie_id`:

     where ub.versie_id = $1 and u.soort = $2 and u.tekst = $3 ...

   Dat is juist voor wat die query doet — "staat deze claim al voor DEZE
   bronversie" — en het is precies wat §4 als probleem aanwijst. Gemeten
   in productie:

     brondocument 73052, rijksoverheid.nl/.../subsidieregeling-
     groepshulpen-in-de-kinderopvang, 2 versies

       versie 3925  "Het beschikbare subsidiebudget voor de
                     aanvraagperiode 2026 is EUR 1.775.000."
       versie 4120  dezelfde zin, dezelfde 1.775.000

   Twee claimrijen, één feit. En in §3 is dat erger dan cosmetisch: wie
   onafhankelijke bevestigingen telt zonder identiteit, telt twee
   versies van één document als twee bronnen.

   ------------------------------------------------------------
   WAT DEZE MODULE DOET, EN WAT NADRUKKELIJK NIET

   WEL: één claim in, één afdruk uit. Twee claims met dezelfde afdruk
   zijn dezelfde feitelijke bewering.

   NIET: ze voegt niets samen en verwijdert niets. "Geen destructieve
   deduplicatie" uit de opdracht is hier een eigenschap: deze module
   heeft geen database, geen delete en geen update. Hij LABELT, en de
   lagen die tellen gebruiken dat label.

   ------------------------------------------------------------
   WAT WEL EN NIET IN DE AFDRUK ZIT, EN WAAROM

   IN DE AFDRUK — wijzig één hiervan en het is een ANDERE claim:

     soort            een datum is geen bedrag
     waarde_numeriek  EXACT; 1.775.000 is niet 1.800.000
     eenheid          8% is niet 8 MW
     claimvorm        een BESLUIT is geen SUBSIDIEVENSTER
     datumrol         een startdatum is geen einddatum
     geldig_vanaf     "per 1 juli" is niet "per 1 augustus"
     geldig_tot       idem
     modaliteit       een VOORSTEL is geen VASTGESTELD feit
     tijdstand        AANGEKONDIGD is niet IN_WERKING
     onderwerp        hetzelfde getal over een ander onderwerp
     kern             de woordketen van de bewering

   Die vier die de opdracht met naam noemt — "een gewijzigd bedrag,
   datum, modaliteit of status" — zitten er dus alle vier in, en elk
   afzonderlijk.

   NIET IN DE AFDRUK:

     de bronversie     dat is juist het punt
     het document      twee documenten mogen hetzelfde feit melden
     de bron           dat is wat §3 als onafhankelijkheid wil tellen
     bewijs_kwaliteit  dat is een oordeel over de claim, niet de claim
     verificatiestatus idem
     de vindplaats     een tekenpositie is geen betekenis

   ------------------------------------------------------------
   DE KERN: WAAROM DE WOORDORDE BLIJFT STAAN

   `kern` is de bronzin zonder interpunctie, zonder stopwoorden, in
   kleine letters — maar MET de oorspronkelijke woordorde.

   Ik heb de gesorteerde variant overwogen en afgewezen. Sorteren zou
   "A is hoger dan B" en "B is hoger dan A" dezelfde afdruk geven, en
   dat zijn tegengestelde beweringen. De prijs van orde bewaren is dat
   een geherformuleerde zin een andere afdruk krijgt en dus niet als
   dezelfde claim wordt herkend — een GEMISTE samenvoeging. Dat is de
   goedkope fout: er staan dan twee claims waar één had gekund. De
   andere kant, twee verschillende beweringen als één feit tellen, is
   de dure fout.

   PUUR: geen database, geen netwerk, geen model.
   ============================================================ */

import { sha256hex } from "../kern/tekst.ts";

/** Verhoog dit bij elke wijziging die een afdruk kan veranderen. */
export const CLAIMIDENTITEIT_VERSIE = "claimidentiteit-v1";

/* ------------------------------------------------------------------
   STOPWOORDEN

   Met opzet kort en met opzet zonder ontkenningen. 'niet', 'geen',
   'nooit' en 'zonder' dragen de bewering: "congestiemanagement kan
   worden toegepast" en "congestiemanagement kan NIET worden toegepast"
   mogen nooit dezelfde afdruk krijgen.

   Ook 'tot', 'meer', 'minder', 'ongeveer' en 'gemiddeld' blijven
   staan: dat zijn de grenswoorden die eerder al eens zijn weggevallen
   (zie uitdrukking.ts) en ze veranderen wat het getal betekent.
   ------------------------------------------------------------------ */
const STOPWOORDEN: ReadonlySet<string> = new Set([
  "de", "het", "een", "en", "of", "van", "in", "op", "voor", "met", "dat",
  "die", "is", "zijn", "er", "aan", "bij", "als", "om", "te", "ook", "naar",
  "door", "uit", "dan", "deze", "dit", "zich", "wordt", "worden", "heeft",
  "hebben", "werd", "werden", "was", "waren", "hun", "haar", "zij", "hij",
  "we", "wij", "u", "ze", "men", "al", "nog", "maar", "want", "toen",
]);

/**
 * De woordketen van een bewering: kleine letters, geen interpunctie,
 * geen stopwoorden, ORDE BEHOUDEN.
 *
 * GETALLEN BLIJVEN STAAN, ook al zit de waarde al apart in de afdruk.
 * Een zin met twee getallen levert twee claims met dezelfde
 * `waarde_numeriek` voor één van de twee; zonder de getallen in de kern
 * zouden die twee claims dezelfde afdruk krijgen.
 */
export function kernVanBewering(tekst: string): string {
  return tekst
    .toLowerCase()
    /* Diakriet weg, zodat 'geïnstalleerd' en 'geinstalleerd' dezelfde
       kern geven. Dat is geen betekenisverschil maar een
       coderingsverschil — en juist daar zaten de dubbel geëscapeerde
       entiteiten (zie §5). */
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    /* Alles wat geen letter, cijfer, komma of punt in een getal is,
       wordt een scheiding. De komma blijft binnen cijfers staan omdat
       '19,4' één getal is. */
    .replace(/(\d),(\d)/g, "$1«komma»$2")
    .replace(/[^\p{L}\p{N}«»]+/gu, " ")
    .replace(/«komma»/g, ",")
    .split(" ")
    .filter((w) => w.length > 0 && !STOPWOORDEN.has(w))
    .join(" ")
    /* BEGRENSD. Een bronzin is maximaal 600 tekens (kort() in
       uitspraken.ts), maar de afdruk hoort niet van die grens af te
       hangen: 400 tekens kern is genoeg om twee beweringen te
       onderscheiden en houdt de sleutel klein. */
    .slice(0, 400);
}

export type ClaimKenmerken = {
  readonly soort: string;
  readonly waardeNumeriek: number | null;
  readonly eenheid: string | null;
  readonly claimvorm: string | null;
  readonly datumrol: string | null;
  readonly geldigVanaf: string | null;
  readonly geldigTot: string | null;
  readonly modaliteit: string | null;
  readonly tijdstand: string | null;
  readonly onderwerp: string | null;
  readonly tekst: string;
};

/**
 * De canonieke afdruk van één claim.
 *
 * DE VORM IS EEN HASH EN GEEN LEESBARE SLEUTEL, om één reden: hij komt
 * in een index en in een groepering, en een sleutel van 400 tekens per
 * rij is daar duur. De LEESBARE vorm staat in canoniekeSleutel()
 * eronder, en die wordt in het logboek en in de toetsen gebruikt — wie
 * een afdruk niet kan navertellen, kan hem niet nameten.
 */
export function claimAfdruk(k: ClaimKenmerken): string {
  return sha256hex(canoniekeSleutel(k)).slice(0, 32);
}

/** De leesbare vorm van de afdruk; hetzelfde in, hetzelfde uit. */
export function canoniekeSleutel(k: ClaimKenmerken): string {
  /* DE WAARDE ALS STRING MET VASTE VORM. `String(1.775e6)` geeft
     '1775000' en `String(0.1+0.2)` geeft '0.30000000000000004'; een
     afdruk mag niet van de drukvorm van een float afhangen. toFixed(6)
     is ruim genoeg voor elk bedrag en elk percentage in deze markt en
     maakt de vorm vast. */
  const waarde =
    k.waardeNumeriek === null || !Number.isFinite(k.waardeNumeriek)
      ? "-"
      : k.waardeNumeriek.toFixed(6);
  return [
    CLAIMIDENTITEIT_VERSIE,
    k.soort,
    waarde,
    k.eenheid ?? "-",
    k.claimvorm ?? "-",
    k.datumrol ?? "-",
    k.geldigVanaf ?? "-",
    k.geldigTot ?? "-",
    k.modaliteit ?? "-",
    k.tijdstand ?? "-",
    k.onderwerp ?? "-",
    kernVanBewering(k.tekst),
  ].join("|");
}

/**
 * Welk veld maakt twee claims verschillend?
 *
 * BESTAAT VOOR DE NAVOLGBAARHEID. "Een gewijzigd bedrag, datum,
 * modaliteit of status moet afzonderlijk herkenbaar blijven" is de eis;
 * deze functie maakt zichtbaar WELKE van die vier het was. Zonder dat
 * is "twee verschillende afdrukken" een uitkomst zonder reden.
 */
export function verschilTussen(
  a: ClaimKenmerken,
  b: ClaimKenmerken,
): readonly string[] {
  const uit: string[] = [];
  const toets = (naam: string, x: unknown, y: unknown) => {
    if (x !== y) uit.push(`${naam}: ${String(x ?? "-")} tegen ${String(y ?? "-")}`);
  };
  toets("soort", a.soort, b.soort);
  toets("waarde", a.waardeNumeriek, b.waardeNumeriek);
  toets("eenheid", a.eenheid, b.eenheid);
  toets("claimvorm", a.claimvorm, b.claimvorm);
  toets("datumrol", a.datumrol, b.datumrol);
  toets("geldig_vanaf", a.geldigVanaf, b.geldigVanaf);
  toets("geldig_tot", a.geldigTot, b.geldigTot);
  toets("modaliteit", a.modaliteit, b.modaliteit);
  toets("tijdstand", a.tijdstand, b.tijdstand);
  toets("onderwerp", a.onderwerp, b.onderwerp);
  const ka = kernVanBewering(a.tekst);
  const kb = kernVanBewering(b.tekst);
  if (ka !== kb) uit.push("kern: de woordketen van de bewering verschilt");
  return uit.length > 0 ? uit : ["geen verschil: dit is dezelfde claim"];
}
