/* ============================================================
   PIJPLIJN — welke ROL speelt een datum in zijn zin?
   ------------------------------------------------------------
   HET GEMETEN GAT.

   Op 6 november 2026 stonden er 39 datumclaims in productie en was er
   geen enkele beoordeeld. De oorzaak zit in semantiekopslag.verrijk():

     if (bewaard === null) { ... return null; }

   Een datumclaim heeft geen `waarde_numeriek`, dus valt hij in die tak
   en komt hij nooit bij de verwoordbaarheidspoort. Dat was GEEN
   vergissing — het commentaar erboven legt uit waarom het alternatief
   erger was: eerder kreeg zo'n claim de EERSTE getaluitdrukking uit
   zijn bronzin opgeplakt, en die koppeling was nooit vastgesteld.

   `null` teruggeven is dus de juiste KEUZE voor de getalroute, en
   tegelijk de reden dat datumclaims onbeoordeeld bleven. Wat ontbrak is
   een eigen route. Die staat hier en in vormpoort.ts.

   ------------------------------------------------------------
   DE ZES ROLLEN KOMEN UIT DE OPDRACHT, LETTERLIJK

     concrete aanvraagperiode          AANVRAAGPERIODE
     startdatum                        STARTDATUM
     einddatum                         EINDDATUM
     publicatiedatum                   PUBLICATIEDATUM
     verwachte datum                   VERWACHTE_DATUM
     losse datum zonder voldoende context  LOSSE_DATUM

   LOSSE_DATUM IS EEN UITKOMST EN GEEN LEEGTE. "Een losse datum is niet
   automatisch een verwoordbare claim" staat in de opdracht; die regel
   is alleen handhaafbaar als "we hebben gekeken en het is er een" te
   onderscheiden is van "we hebben niet gekeken". Vandaar een eigen
   waarde in plaats van NULL, met een CHECK in 0054 die hem nooit
   verwoordbaar laat worden.

   ------------------------------------------------------------
   DE ORDE VAN DE TOETSEN, EN WAAROM

     1 AANVRAAGPERIODE  een periode met twee grenzen is meer dan een
                        losse start of een los einde; wie eerst op
                        'vanaf' toetst, maakt van een aanvraagperiode
                        een startdatum en verliest de sluiting.
     2 PUBLICATIEDATUM  vóór start en einde, want "gepubliceerd op
                        2 juni 2026" bevat geen voorzetsel dat de
                        andere toetsen pakken, maar "in de
                        Staatscourant van 1 juli 2026" wel bijna.
     3 VERWACHTE_DATUM  vóór start en einde, want "treedt naar
                        verwachting per 1 juli in werking" is een
                        verwachting en geen vastgestelde startdatum.
                        Dit is "verwacht ≠ gerealiseerd" uit de
                        opdracht, op de datumas.
     4 STARTDATUM
     5 EINDDATUM
     6 LOSSE_DATUM      geen signaal.

   PUUR: geen database, geen netwerk, geen model.
   ============================================================ */

import { kort } from "../kern/tekst.ts";

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const DATUMROL_VERSIE = "datumrol-v1";

export type Datumrol =
  | "AANVRAAGPERIODE"
  | "STARTDATUM"
  | "EINDDATUM"
  | "PUBLICATIEDATUM"
  | "VERWACHTE_DATUM"
  | "LOSSE_DATUM";

export type DatumrolUitslag = {
  readonly rol: Datumrol;
  /** Het LETTERLIJKE fragment dat de rol aanwijst. Leeg bij LOSSE_DATUM. */
  readonly passage: string;
  readonly reden: string;
  /**
   * WAT de datum betreft: 'de aanvraagperiode', 'de regeling', 'het
   * besluit'. Null als de zin het niet noemt — en dan is de claim niet
   * verwoordbaar, want een datum zonder onderwerp is geen bewering.
   */
  readonly betreft: string | null;
  readonly versie: string;
};

/* ------------------------------------------------------------------
   1 · AANVRAAGPERIODE — twee grenzen, of het woord zelf.

   Gemeten in het corpus: "Het beschikbare subsidiebudget voor de
   aanvraagperiode 2026 is EUR 1.775.000." en "aanvragen kunnen van
   1 maart tot en met 30 september worden ingediend".
   ------------------------------------------------------------------ */
const AANVRAAGPERIODE_P: readonly RegExp[] = [
  /\b(aanvraagperiode|aanvraagtermijn|openstellingsperiode|indieningstermijn|inschrijfperiode)\b/iu,
  /\b(?:van|vanaf)\s+\d{1,2}\s+\w+(?:\s+20\d\d)?\s+(?:tot\s+en\s+met|tot|t\/m)\s+\d{1,2}\s+\w+\s+20\d\d/iu,
  /\b(?:aanvragen|aanvraag|indienen|inschrijven)\b[^.]{0,60}\b(?:van|vanaf)\s+\d{1,2}\s+\w+[^.]{0,40}\b(?:tot|t\/m)\b/iu,
];

/* 2 · PUBLICATIEDATUM — wanneer het stuk uitkwam.

   Dit is de rol waar de opdracht om vraagt én de rol die het MINST
   zegt: dat de ACM op 2 juni 2026 iets publiceerde, is waar en zelden
   nieuws. De rol bestaat om hem te kunnen ONDERSCHEIDEN van een
   ingangsdatum, niet om hem te kunnen publiceren. */
const PUBLICATIEDATUM_P: readonly RegExp[] = [
  /\b(gepubliceerd\s+(?:op|in)|publiceerde\s+(?:op)?|verscheen\s+op|bekendgemaakt\s+op|bekend\s+gemaakt\s+op|uitgebracht\s+op)\b/iu,
  /\b(?:in\s+de\s+)?staatscourant\s+van\b/iu,
  /\bbrief\s+van\s+\d{1,2}\s+\w+\s+20\d\d\b/iu,
];

/* 3 · VERWACHTE_DATUM — "verwacht ≠ gerealiseerd", op de datumas. */
const VERWACHTE_DATUM_P: readonly RegExp[] = [
  /\b(naar\s+verwachting|verwacht(?:ing)?\s+(?:is\s+)?(?:dat|in|op|per|medio)|wordt\s+verwacht|vermoedelijk|waarschijnlijk\s+(?:in|op|per)|beoogde?\s+(?:datum|ingangsdatum|startdatum)|streeft?\s+naar|voorzien\s+(?:in|voor|op)|gepland\s+(?:voor|in|op))\b/iu,
  /\b(?:moet|moeten)\s+(?:in|op|per|uiterlijk)\s+[^.]{0,30}\b(?:klaar|gereed|afgerond|operationeel)\b/iu,
];

/* 4 · STARTDATUM */
const STARTDATUM_P: readonly RegExp[] = [
  /\b(met\s+ingang\s+van|ingangsdatum|per\s+\d{1,2}\s+\w+\s+20\d\d|vanaf\s+\d{1,2}\s+\w+\s+20\d\d|sinds\s+\d{1,2}\s+\w+\s+20\d\d|treedt\s+(?:op\s+)?\d{1,2}\s+\w+\s+20\d\d\s+in\s+werking|treedt\s+in\s+werking\s+(?:op|per)|start\s+(?:op|per)|gaat\s+(?:op|per)\s+\d{1,2}\s+\w+\s+20\d\d\s+(?:in|gelden))\b/iu,
  /\b(?:geldt|gelden|gaat\s+gelden|van\s+kracht)\s+(?:vanaf|per|sinds)\b/iu,
];

/* 5 · EINDDATUM

   'voor <datum>' HOORT ERBIJ, EN DAT WAS EEN ASYMMETRIE.
   ------------------------------------------------------------------
   zoekDatums() in uitspraken.ts rekent 'voor' al tot de eindgrenzen —
   het staat daar in dezelfde lijst als 'tot', 'tot en met' en
   'uiterlijk' — en zette dus geldig_tot. Dit bestand kende die vorm
   niet, dus kreeg dezelfde claim rol LOSSE_DATUM.

   GEMETEN OP DE 39 ECHTE DATUMCLAIMS, 6 november 2026. Claim 16:

     "Aanvragen ontvangen voor 1 juli 2026 — Kleinverbruikaanvragen
      worden toegekend"

   Die claim HAD een geldig_tot uit de extractie en kwam hier uit op
   'losse datum zonder voldoende context'. Dat is dezelfde klasse fout
   als die tussen uitspraken.ts en uitdrukking.ts: twee lagen met
   hetzelfde doel en een iets ander woordenboek, waardoor een geldige
   claim in de ene laag wordt gevonden en in de andere stil wegvalt.

   DIT VERLAAGT GEEN DREMPEL. De rol wordt juister, niet milder: een
   EINDDATUM moet nog steeds bevestigd zijn, een onderwerp hebben en
   een zin opleveren voordat hij verwoordbaar wordt. */
const EINDDATUM_P: readonly RegExp[] = [
  /\b(tot\s+en\s+met\s+\d{1,2}\s+\w+\s+20\d\d|uiterlijk\s+\d{1,2}\s+\w+\s+20\d\d|sluit\s+(?:op|per)|einddatum|loopt\s+(?:af|tot)|vervalt\s+(?:op|per)|geldig\s+tot|deadline|laatste\s+dag)\b/iu,
  /\b(?:tot|voor)\s+\d{1,2}\s+\w+\s+20\d\d\b/iu,
];

/* ------------------------------------------------------------------
   WAT BETREFT DE DATUM?

   Een datum zonder onderwerp is geen bewering: "1 juli 2027" zegt
   niets. Dit vocabulaire is met opzet beperkt tot de dingen waar dit
   platform over gaat; een onbekend onderwerp geeft `null` en daarmee
   geen verwoordbare claim. Dat is dezelfde keuze als het
   subjectvocabulaire in semantiek.ts: liever niets dan een verzonnen
   onderwerp.
   ------------------------------------------------------------------ */
const BETREFT: readonly { readonly patroon: RegExp; readonly naam: string }[] = [
  /* GEEN `\b` NA '++'. Een woordgrens na een plusteken eist een
     woordkarakter aan de andere kant, en achter 'SDE++' staat een
     spatie — dus `SDE\+\+\b` matcht nooit. Betrapt door de eigen toets
     'het betreft-vocabulaire verzint niets'. */
  { patroon: /\bSDE\+\+|\bSDE\s?plus\b|\bsde-regeling\b/iu, naam: "de SDE++-regeling" },
  { patroon: /\b(ISDE|investeringssubsidie\s+duurzame\s+energie)\b/iu, naam: "de ISDE" },
  { patroon: /\b(energiewet|elektriciteitswet|gaswet|warmtewet)\b/iu, naam: "de wet" },
  { patroon: /\b(netcode|tarievencode|systeemcode|meetcode)\b/iu, naam: "de code" },
  { patroon: /\b(EPBD(?:\s?IV)?|richtlijn\s+\d{4}\/\d+)\b/iu, naam: "de Europese richtlijn" },
  { patroon: /\b(aansluitspecificaties?)\b/iu, naam: "de aansluitspecificaties" },
  { patroon: /\b(subsidieregeling|subsidie\w*|regeling)\b/iu, naam: "de regeling" },
  { patroon: /\b(congestiemanagement|congestierapport|congestiegebied)\b/iu, naam: "het congestiebeleid" },
  { patroon: /\b(nettarief|nettarieven|tariefbesluit|tarieven)\b/iu, naam: "de nettarieven" },
  { patroon: /\b(verplichting|verplicht)\b/iu, naam: "de verplichting" },
  { patroon: /\b(besluit|geschilbesluit|beschikking)\b/iu, naam: "het besluit" },
  { patroon: /\b(slimme\s+meter|digitale\s+meter)\b/iu, naam: "de slimme meter" },
  { patroon: /\b(energielabel)\b/iu, naam: "het energielabel" },
  { patroon: /\b(laadpaal|laadpalen|laadinfrastructuur|laadplein)\b/iu, naam: "de laadinfrastructuur" },
  { patroon: /\b(terugleververgoeding|salderingsregeling|saldering)\b/iu, naam: "de salderingsregeling" },
];

function eersteTreffer(patronen: readonly RegExp[], zin: string): string | null {
  let beste: { fragment: string; index: number } | null = null;
  for (const p of patronen) {
    const m = p.exec(zin);
    if (m === null || !m[0]) continue;
    if (beste === null || m.index < beste.index) {
      beste = { fragment: m[0].trim(), index: m.index };
    }
  }
  return beste?.fragment ?? null;
}

/**
 * WAT de claim betreft, uit een gesloten vocabulaire.
 *
 * GEEXPORTEERD omdat claimvorm.ts hem óók nodig heeft: een
 * SUBSIDIEVENSTER zonder regeling is geen bewering ("er is een
 * aanvraagperiode" — van wat?), net zoals een datum zonder onderwerp er
 * geen is. Dat is dezelfde vraag, dus hoort het hetzelfde vocabulaire
 * te zijn. Twee lijsten die hetzelfde bedoelen lopen uit elkaar; zie de
 * toelichting bij SCHAAL in uitspraken.ts voor wat dat kost.
 *
 * Geeft null als het vocabulaire niets herkent. Dat is de veilige kant:
 * liever geen bewering dan een verzonnen onderwerp.
 */
export function herkenBetreft(zin: string): string | null {
  for (const b of BETREFT) {
    if (b.patroon.test(zin)) return b.naam;
  }
  return null;
}

function betreftVan(zin: string): string | null {
  return herkenBetreft(zin);
}

/**
 * Bepaalt de rol van de datum in deze zin.
 *
 * DE PASSAGE IS VERPLICHT voor elke rol behalve LOSSE_DATUM, en bij
 * LOSSE_DATUM is hij juist leeg — dat is het verschil tussen "de bron
 * zegt waarvoor deze datum is" en "de bron zegt dat niet". 0054 eist
 * een passage van tien tekens zodra er een rol staat; daarom valt een
 * te kort fragment terug op de zinsnede eromheen, uit de bron.
 */
export function bepaalDatumrol(zin: string): DatumrolUitslag {
  const t = zin.trim();
  const betreft = betreftVan(t);

  const beslis = (
    rol: Datumrol,
    fragment: string,
    reden: string,
  ): DatumrolUitslag => {
    const passage =
      fragment.length >= 10
        ? fragment
        : (() => {
            const i = t.toLowerCase().indexOf(fragment.toLowerCase());
            if (i < 0) return fragment;
            return t
              .slice(Math.max(0, i - 25), Math.min(t.length, i + fragment.length + 25))
              .trim();
          })();
    return {
      rol,
      passage: kort(passage, 240),
      reden,
      betreft,
      versie: DATUMROL_VERSIE,
    };
  };

  const periode = eersteTreffer(AANVRAAGPERIODE_P, t);
  if (periode !== null) {
    return beslis(
      "AANVRAAGPERIODE",
      periode,
      `de zin noemt een aanvraagperiode met een begin en een einde — "${kort(periode, 70)}"`,
    );
  }

  const publicatie = eersteTreffer(PUBLICATIEDATUM_P, t);
  if (publicatie !== null) {
    return beslis(
      "PUBLICATIEDATUM",
      publicatie,
      `de datum is de publicatiedatum van het stuk — "${kort(publicatie, 70)}". Dat is ` +
        "iets anders dan de datum waarop iets gaat gelden",
    );
  }

  const verwacht = eersteTreffer(VERWACHTE_DATUM_P, t);
  if (verwacht !== null) {
    return beslis(
      "VERWACHTE_DATUM",
      verwacht,
      `de datum is een verwachting of een streven en geen vastgestelde datum — ` +
        `"${kort(verwacht, 70)}"`,
    );
  }

  const start = eersteTreffer(STARTDATUM_P, t);
  if (start !== null) {
    return beslis(
      "STARTDATUM",
      start,
      `de zin bindt de datum aan een ingang — "${kort(start, 70)}"`,
    );
  }

  const eind = eersteTreffer(EINDDATUM_P, t);
  if (eind !== null) {
    return beslis(
      "EINDDATUM",
      eind,
      `de zin bindt de datum aan een einde of een uiterste termijn — "${kort(eind, 70)}"`,
    );
  }

  return {
    rol: "LOSSE_DATUM",
    passage: "",
    reden:
      "de zin noemt een datum zonder te zeggen wat die datum is: geen aanvraagperiode, " +
      "geen ingang, geen einde, geen publicatiedatum en geen verwachting. Een losse datum " +
      "is geen bewering en wordt niet verwoordbaar.",
    betreft,
    versie: DATUMROL_VERSIE,
  };
}
