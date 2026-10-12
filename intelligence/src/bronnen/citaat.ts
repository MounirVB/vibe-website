/* ============================================================
   CITAATPOORT — het verschil tussen verwerken en overnemen
   ------------------------------------------------------------
   WAAROM DEZE LAAG NU PAS BESTAAT

   `magCiteren` en `citaatLimietTekens` stonden al in het bronregister en
   werden al naar intel.bronnen geschreven. Maar een grep op de hele
   broncode gaf buiten soorten.ts (interne consistentie) en zaai.ts
   (wegschrijven) GEEN enkele lezer. Er was dus geen handhaving — alleen
   een bewaarde intentie.

   Dat was tot nu toe zonder gevolg, om een onbedoelde reden: de
   TenderNed-config had geen tekstVelden, dus brondocument.tekst was leeg
   en er was niets om per ongeluk over te nemen. Door die config te
   repareren verdwijnt die toevallige bescherming. Vanaf nu draagt
   `markt_gebeurtenissen` echte brontekst, en wordt de vraag 'mag dit
   zichtbaar worden' voor het eerst scherp.

   HET ONDERSCHEID DAT DEZE MODULE HANDHAAFT

   ophalen en verwerken   mag, mits de toestemmingsladder dat zegt
   letterlijk weergeven   mag alleen als de bron dat toestaat

   Voor TenderNed is dat laatste expliciet NEE: magCiteren=false en
   citaatLimietTekens=0 (STANDAARD in register.ts). Bij een CC0-bron is
   dat juridisch strenger dan nodig, maar het is wat er geregistreerd
   staat, en het register is de bron van waarheid — niet mijn inschatting
   van wat CC0 toestaat.

   WAT WEL MAG, ALTIJD

   Feiten. 'Sluit op 2026-12-02', 'Openbare procedure', 'Leveringen',
   'kenmerk 599611', 'beheer en onderhoud minimaal 4 jaar': dat zijn
   gegevens, geen overgenomen formulering. Een dossier dat op feiten
   leunt in plaats van op citaten is niet alleen toegestaan, het is ook
   bruikbaarder — een inkoper heeft een datum nodig, geen alinea.

   DAAROM GEEFT `beperkCitaat` BIJ WEIGERING GEEN LEGE STRING

   Een lege string ziet eruit als 'er was niets'. Deze module geeft een
   expliciete weigering mét reden terug, zodat een scherm kan laten zien
   DAT er brontekst is en waarom die niet wordt weergegeven, met de link
   naar de bron ernaast. Stil weglaten zou de gebruiker laten denken dat
   de bron niets zegt.
   ============================================================ */

/** Het deel van een bron dat over citeren gaat. */
export type CitaatBeleid = {
  readonly sleutel: string;
  readonly magCiteren: boolean;
  readonly citaatLimietTekens: number;
};

export type CitaatUitslag =
  | { readonly toegestaan: true; readonly tekst: string; readonly afgekapt: boolean }
  | { readonly toegestaan: false; readonly reden: string; readonly bronSleutel: string };

/**
 * Levert een weer te geven citaat, of een weigering met reden.
 *
 * Geeft NOOIT meer terug dan `citaatLimietTekens`, en kapt af op een
 * woordgrens zodat er geen half woord op het scherm staat.
 */
export function beperkCitaat(beleid: CitaatBeleid, tekst: string | null): CitaatUitslag {
  const bron = beleid.sleutel;

  if (!beleid.magCiteren || beleid.citaatLimietTekens <= 0) {
    return {
      toegestaan: false,
      reden:
        `bron '${bron}' staat letterlijk weergeven niet toe ` +
        `(mag_citeren=${beleid.magCiteren}, citaat_limiet_tekens=${beleid.citaatLimietTekens}). ` +
        `De brontekst is wel verwerkt; gebruik de vastgestelde feiten en de bronlink.`,
      bronSleutel: bron,
    };
  }

  const schoon = (tekst ?? "").trim();
  if (schoon.length === 0) {
    return {
      toegestaan: false,
      reden: `bron '${bron}' mag geciteerd worden, maar dit document heeft geen brontekst`,
      bronSleutel: bron,
    };
  }

  if (schoon.length <= beleid.citaatLimietTekens) {
    return { toegestaan: true, tekst: schoon, afgekapt: false };
  }

  const ruw = schoon.slice(0, beleid.citaatLimietTekens);
  const grens = ruw.lastIndexOf(" ");
  const kort = (grens > beleid.citaatLimietTekens * 0.6 ? ruw.slice(0, grens) : ruw).trimEnd();
  return { toegestaan: true, tekst: `${kort}…`, afgekapt: true };
}

/**
 * Harde poort voor alles wat naar buiten gaat.
 *
 * Een voorstel, een e-mailconcept of een gegenereerde alinea mag geen
 * letterlijke brontekst bevatten van een bron die citeren verbiedt.
 * Deze functie faalt luidruchtig in plaats van stil te filteren: stil
 * filteren zou een voorstel kunnen opleveren waar een belangrijke zin
 * zonder spoor uit verdwenen is.
 */
export function controleerGeenCitaat(
  beleid: CitaatBeleid,
  brontekst: string | null,
  uitvoer: string,
): { ok: true } | { ok: false; reden: string; fragment: string } {
  if (beleid.magCiteren && beleid.citaatLimietTekens > 0) return { ok: true };

  const bron = (brontekst ?? "").trim();
  if (bron.length < DREMPEL_WOORDEN_TEKENS) return { ok: true };

  /* Een aaneengesloten reeks van DREMPEL_WOORDEN woorden uit de bron die
     ook in de uitvoer staat, is een citaat — ook zonder aanhalingstekens.
     Korter dan dat is niet te onderscheiden van gewoon Nederlands
     ('het ontwerpen, leveren en installeren van' komt in elke
     aanbesteding voor). */
  const bronWoorden = woorden(bron);
  const uitvoerGenormaliseerd = ` ${woorden(uitvoer).join(" ")} `;

  for (let i = 0; i + DREMPEL_WOORDEN <= bronWoorden.length; i++) {
    const reeks = bronWoorden.slice(i, i + DREMPEL_WOORDEN).join(" ");
    if (uitvoerGenormaliseerd.includes(` ${reeks} `)) {
      return {
        ok: false,
        reden:
          `de uitvoer neemt ${DREMPEL_WOORDEN} opeenvolgende woorden letterlijk over uit bron ` +
          `'${beleid.sleutel}', die citeren niet toestaat`,
        fragment: reeks,
      };
    }
  }
  return { ok: true };
}

/**
 * Acht woorden. Korter levert valse treffers op standaardformuleringen
 * die in elke aanbesteding staan; langer laat een overgenomen zin door.
 */
const DREMPEL_WOORDEN = 8;
const DREMPEL_WOORDEN_TEKENS = 40;

function woorden(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
