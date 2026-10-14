/* ============================================================
   OPS — meldernst: wat betekent dit signaal voor een mens?
   ------------------------------------------------------------
   `Niveau` zegt wat de METING zag: OK, LET OP, FOUT, NIET GEMETEN.
   Dat is geen alarmklasse. Deze module zet het om naar wat een mens
   ervan moet merken, en bundelt signalen die EEN oorzaak hebben.

   WAAROM DIT APART STAAT, EN NIET IN gezondheid.ts
   De gezondheidsmeting mag niet weten of er gemaild wordt. Hij meet.
   Deze laag beslist wie er 's nachts wakker van wordt, en dat is een
   andere vraag met een ander antwoord.

   DRIE DINGEN DIE HIER GEMETEN ZIJN, NIET BEDACHT

   1 EEN AANVAARDE GRENS BELT NIEMAND. Het veld `aanvaard` bestaat al op
     `Signaal` met precies deze betekenis: "een BEKENDE en aanvaarde
     beperking, geen nieuw probleem ... blijft zichtbaar — er wordt niets
     weggemoffeld — maar hij tilt de totaalernst niet verder dan
     DEGRADED". Een alarm voor een grens die we zelf hebben aanvaard is
     ruis, en ruis maakt dat niemand meer kijkt. Het signaal blijft
     onverkort in het gezondheidsrapport staan.

     Gemeten gevolg op productie, 14 oktober 2026: van de tien open
     meldingen dragen er drie `aanvaard` (ingestie/toestemming niet
     vastgesteld, melden/alerteringsbestemming, backup/aanwezigheid).
     Die krijgen geen ernst en dus geen alarm.

   2 DRIE SIGNALEN, EEN OORZAAK. Ook gemeten op 14 oktober 2026: de drie
     FOUT-signalen

       ingestie/bronnen met opeenvolgende fouten
       ingestie/storingssoort TOEGANG_BEPERKT
       ingestie/brondekking

     noemen alle drie dezelfde bron: rendo-nieuws. Drie e-mails voor een
     probleem is geen monitoring. De bundel haalt de BRONSLEUTEL uit de
     meting en groepeert erop; de drie meldingen blijven apart bestaan,
     want ze meten elk iets anders en ze herstellen niet per se samen.

   3 CRITICAL IS EEN KORTE LIJST, EN HIJ IS AFGEBAKEND OP GROEP. Niet elk
     FOUT is een noodgeval. De opdracht noemt back-up, restore, database
     en integriteit; dat zijn in dit platform de groepen `backup`,
     `database`, `beveiliging` en `publicatie`. Een kapotte nieuwsbron is
     een operationele fout, geen noodgeval — en dat onderscheid is precies
     wat een alarmeerder bruikbaar houdt.

   WAT DIT NIET DOET
   Het verzwakt geen enkele controle. Een signaal dat FOUT is blijft FOUT
   in het gezondheidsrapport, in de ernstrapportage en in `intel.meldingen`.
   Deze module bepaalt alleen of en hoe er een BERICHT over uitgaat.
   ============================================================ */

import { sha256hex } from "../kern/tekst.ts";
import type { Niveau, Signaal } from "./gezondheid.ts";

/** De alarmklasse. `null` betekent: zichtbaar, maar geen bericht. */
export type Meldernst = "CRITICAL" | "FOUT" | "WARNING";

/**
 * Groepen waar een storing het platform in zijn kern raakt.
 *
 * `backup` — een ontbrekende of onherstelbare back-up is onomkeerbaar
 *            verlies zodra er iets anders misgaat.
 * `database` — valt die weg, dan werkt niets.
 * `beveiliging` — een falende integriteits- of rechtencontrole.
 * `publicatie` — de grendels die voorkomen dat er ongezien iets live gaat.
 */
const KRITIEKE_GROEPEN: ReadonlySet<string> = new Set([
  "backup",
  "database",
  "beveiliging",
  "publicatie",
]);

/**
 * De alarmklasse van een signaal.
 *
 * `null` = geen bericht. Dat geldt voor OK, voor elke aanvaarde grens, en
 * voor LET OP buiten de kritieke groepen — die laatste gaat mee in het
 * dagelijkse overzicht via `warningOverzicht()` en niet als los alarm.
 */
export function ernstVan(s: Signaal): Meldernst | null {
  if (s.niveau === "OK") return null;
  /* De aanvaarde grens. Zie punt 1 in de kop. */
  if (s.aanvaard === true) return null;

  if (s.niveau === "FOUT") {
    return KRITIEKE_GROEPEN.has(s.groep) ? "CRITICAL" : "FOUT";
  }
  /* NIET GEMETEN in een kritieke groep is ook kritiek: 'we weten niet of
     de back-up er is' is operationeel hetzelfde als 'hij is er niet'. */
  if (s.niveau === "NIET GEMETEN") {
    return KRITIEKE_GROEPEN.has(s.groep) ? "CRITICAL" : "WARNING";
  }
  /* LET OP */
  return "WARNING";
}

/** Oplopend, zodat een stijging te meten is. */
const RANG: Readonly<Record<Meldernst, number>> = { WARNING: 1, FOUT: 2, CRITICAL: 3 };

export function ernstStijgt(oud: Meldernst | null, nieuw: Meldernst | null): boolean {
  if (!nieuw) return false;
  if (!oud) return true;
  return RANG[nieuw] > RANG[oud];
}

/* ------------------------------------------------------------------
   DE BUNDEL

   Een signaal noemt zijn oorzaak in de METING, niet in de naam. De
   bronsleutels staan er in een vaste vorm in — gemeten op productie:

     "1 van 20 actieve bronnen met >= 3 fouten achtereen: rendo-nieuws"
     "1 bron(nen), waarvan 1 actief: rendo-nieuws — detail: rendo-nieuws http=403 ..."
     "29 bronnen: 20 actief (...) — FAILED: rendo-nieuws"

   In alle drie staat de sleutel na een dubbele punt, als kebab-case
   woord. Die vorm is wat we eruit halen; vinden we niets, dan is de
   bundel de signaalgroep plus naam en staat het signaal dus op zichzelf.

   WAAROM NIET OP GROEP BUNDELEN: dan vallen alle ingestiesignalen op een
   hoop, ook die van verschillende bronnen. Dan is de bundel wel klein
   maar zegt hij niets meer over de oorzaak.
   ------------------------------------------------------------------ */

/** Een bronsleutel: kleine letters, cijfers en koppeltekens, min. 4 tekens. */
const BRONSLEUTEL = /\b([a-z][a-z0-9]*(?:-[a-z0-9]+){1,4})\b/g;

/* Woorden die op een bronsleutel lijken maar het niet zijn. Gemeten in de
   echte metingteksten; zonder deze lijst wordt 'niet-ok' een bundel. */
const GEEN_BRONSLEUTEL: ReadonlySet<string> = new Set([
  "niet-ok",
  "niet-gemeten",
  "let-op",
  "e-mail",
  "back-up",
  "read-only",
  "append-only",
  "not-valid",
  "pre-deploy",
]);

/**
 * De groeperingssleutel van de onderliggende oorzaak.
 *
 * Geeft `bron:<sleutel>` als de meting een bronsleutel noemt, anders
 * `signaal:<groep>/<naam>` — dan staat het signaal op zichzelf.
 */
export function bundelVan(s: Signaal): string {
  /* HET VASTGELEGDE FEIT GAAT VOOR DE TEKSTVONDST (3.0.9, tweede helft).
     De regex hieronder leest de bronsleutel uit de MEETTEKST, en die
     tekst wordt bij alle drie de ingestiesignalen afgekapt op 160
     tekens (ops/brondekking.ts, en twee plekken in ops/gezondheid.ts).
     Een signaal dat werkelijk over VIJF bronnen gaat kan daardoor maar
     EEN sleutel tonen — gemeten geval: `ingestie/toestemming niet
     vastgesteld` somt vijf sleutels op. De regex pakt dan de eerste en
     maakt er `bron:<die ene>` van, waarmee twee signalen onder een
     gedeelde noemer belanden zonder dat die gedeelde oorzaak vaststaat.
     Dat is de verkeerde kant op falen.

     Daarom zet de gezondheidsmeting sinds 3.0.9 `Signaal.bron` ALLEEN
     als er aantoonbaar precies een bron in het spel is — uit de
     TELLING, niet uit de tekst. Is dat veld gezet, dan is het het
     antwoord. Is het leeg, dan blijft de bestaande regexweg gelden:
     dat is geen verslechtering, want die weg was er al en hij is beter
     dan niets. */
  if (s.bron && s.bron.trim()) return `bron:${s.bron.trim()}`;

  /* ALLEEN IN DE INGESTIEGROEP ZOEKEN NAAR EEN BRONSLEUTEL.
     Gemeten tijdens het bouwen: het signaal backup/aanwezigheid kreeg
     bundel `bron:back-upmap`, omdat de regex het woord 'back-upmap' uit
     de meting als bronsleutel las. Dat is geen bron, en het zou twee
     losse backupstoringen onder een valse noemer samenvoegen.

     De grens is niet een langere lijst verboden woorden — die vergeet je
     bij het volgende signaal — maar de GROEP. Bronsleutels bestaan
     alleen in de ingestielaag; buiten die groep is een kebab-woord
     gewoon een woord. */
  if (s.groep !== "ingestie") return `signaal:${s.groep}/${s.naam}`;

  const na = s.meting.includes(":") ? s.meting.slice(s.meting.indexOf(":") + 1) : s.meting;
  const kandidaten = [...na.matchAll(BRONSLEUTEL)]
    .map((m) => m[1]!)
    .filter((w) => !GEEN_BRONSLEUTEL.has(w));
  /* De EERSTE treffer, niet een willekeurige: de meting noemt de
     oorzaak vooraan en daarna eventueel details. */
  const eerste = kandidaten[0];
  if (eerste) return `bron:${eerste}`;
  return `signaal:${s.groep}/${s.naam}`;
}

/* ------------------------------------------------------------------
   DE VINGERAFDRUK

   Dedupliceren op 'is er al een bericht over deze bundel' is te grof:
   dan verandert er nooit meer iets. Dedupliceren op de volledige
   metingtekst is te fijn: een teller die van 3 naar 4 loopt zou een nieuw
   alarm geven.

   Daartussen: de ernst, de signaalsleutels en de GENORMALISEERDE meting,
   waarin losse getallen zijn weggelaten. Zo geeft een oplopende
   foutenteller geen nieuw bericht, maar een andere HTTP-status of een
   nieuwe bron wel.
   ------------------------------------------------------------------ */

export function normaliseerMeting(meting: string): string {
  return meting
    /* Tijdstempels eerst: die veranderen elke ronde. */
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z?/g, "<tijd>")
    .replace(/\d{4}-\d{2}-\d{2}/g, "<datum>")
    /* http=403 en foutsoort= moeten BLIJVEN: die veranderen van betekenis.
       Daarom alleen vrijstaande getallen vervangen. */
    .replace(/(?<![=\w])\d+([.,]\d+)?(?!\w)/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function vingerafdrukVan(
  ernst: Meldernst | null,
  signalen: readonly { readonly sleutel: string; readonly meting: string }[],
): string {
  const kern = [
    ernst ?? "GEEN",
    ...[...signalen]
      .map((s) => `${s.sleutel}|${normaliseerMeting(s.meting)}`)
      .sort(),
  ].join("\n");
  return sha256hex(kern).slice(0, 32);
}
