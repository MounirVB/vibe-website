/* ============================================================
   REGIO — gebiedsherkenning in brontekst
   ------------------------------------------------------------
   Van een gebeurtenis vaststellen OVER WELK GEBIED hij gaat. Dat
   klinkt als een opzoekactie en is het niet: Nederlandse
   gemeentenamen zijn voor een flink deel ook gewone woorden, en twee
   ervan zijn ook een provincienaam.

   GEMETEN OP DE 342 GEMEENTEN VAN data/geo/gemeenten.json
   (10 oktober 2026):

   · `Groningen` en `Utrecht` zijn ZOWEL een gemeente ALS een
     provincie. Zonder aanwijzing is "in Utrecht" niet te beslissen.
   · Acht namen zijn vier tekens of korter: Beek, Best, Ede, Epe,
     Goes, Oss, Tiel, Urk.
   · Zestien namen zijn ook een gewoon Nederlands woord of een
     veelgebruikte eigennaam: Beek, Best, Bloemendaal, Borne, Buren,
     Ede, Epe, Heerde, Laren, Losser, Meerssen, Raalte, Sluis, Stein,
     Urk, Zeist.
   · Dubbele gemeentenamen bestaan niet in deze dataset.

   "De netbeheerder kiest het best passende tarief" bevat dus de
   gemeente Best, en "een batterij in de kelder van een pand in Stein"
   kan over de gemeente Stein gaan of over een constructiedeel.

   WAAROM HOOFDLETTERS GEEN BETROUWBAAR SIGNAAL ZIJN
   Een eerdere versie van dit bestand eiste een hoofdletter voor elke
   naam. Gemeten op de echte feeds faalt dat: meerdere bronnen
   publiceren hun titels volledig in kleine letters. Echte voorbeelden
   uit de 138 gebeurtenissen van 10 oktober 2026:

     "vijf bedrijven in nijmegen zetten samen met liander
      belangrijke stap in aanpak netcongestie"
     "actieplan netcongestie zuid holland slimmer omgaan met
      schaarse ruimte op het stroomnet"

   Daar staat Nijmegen, Liander en Zuid-Holland in, en de
   hoofdletterregel miste alle drie. Let ook op "zuid holland" zonder
   streepje, terwijl de officiële naam "Zuid-Holland" is.

   De hoofdletter is daarom alleen nog een eis waar hij écht
   onderscheidt: bij de risiconamen. "Nijmegen" betekent niets anders
   dan de gemeente, dus daar mag het kleine letters zijn. "best"
   betekent wel iets anders, dus daar moet het "Best" zijn én met
   aanwijzing.

   DE REGELS, IN DEZE ORDE

   1 EEN EXPLICIETE CODE WINT ALTIJD. `GM0014` of `PV20` in de tekst
     is een feit, geen gok. Grondslag `code_match`.
   2 EEN ONDUBBELZINNIGE NAAM MAG IN KLEINE LETTERS. Streepjes en
     spaties zijn uitwisselbaar, zodat "zuid holland" de provincie
     Zuid-Holland vindt.
   3 EEN RISICONAAM VRAAGT HOOFDLETTER ÉN AANWIJZING. Er moet
     "gemeente X", "in X", "te X", "regio X" of "X e.o." staan, met X
     zoals de officiële naam gespeld. Anders wordt de naam GEWEIGERD
     met reden, niet stil overgeslagen.
   4 EEN AMBIGUE NAAM VRAAGT ALTIJD EEN AANWIJZING die zegt welk
     bestuurlijk niveau bedoeld is. Staat die er niet, dan wordt er
     NIETS gebonden. Onbekend blijft onbekend; een gok op
     provincieniveau zou een gemeentelijk feit over 20 andere
     gemeenten uitsmeren.
   5 EEN NETBEHEERDER IS EEN EIGEN GEBIEDSSOORT. "Liander" noemen is
     een expliciete vermelding van een netbeheerdergebied, niet een
     uitspraak over de 130 gemeenten daarin. Binden op het
     netbeheerdergebied zelf houdt de uitspraak zo scherp als de bron
     hem deed.

   WAAR DE TEKST VANDAAN KOMT
   Niet uit de samenvatting van de gebeurtenis: die is door dit
   platform zelf gegenereerd ("Onderwerp netbeheer. 1
   bronwaarneming(en)...") en bevat per definitie geen plaatsnaam. De
   invoer is de titel en de ruwe tekst van het BRONDOCUMENT. Zie
   src/regio/impacts.ts.

   WAT HIER NIET GEBEURT
   Geen fuzzy matching, geen Levenshtein, geen "lijkt op". Een naam
   die niet exact voorkomt is niet gevonden. Een bijna-treffer op een
   gemeentenaam is in dit domein vrijwel altijd een andere plaats.
   ============================================================ */

export type GebiedSoort = "provincie" | "gemeente" | "netbeheerdergebied" | "land";

export type Gebied = {
  readonly soort: GebiedSoort;
  readonly code: string;
  readonly naam: string;
  readonly aliassen?: readonly string[];
};

export type Grondslag = "bron_expliciet" | "code_match" | "afgeleid";

export type GeoTreffer = {
  readonly soort: GebiedSoort;
  readonly code: string;
  readonly naam: string;
  readonly grondslag: Grondslag;
  readonly bewijs: string;
};

export type GeoAfwijzing = {
  readonly naam: string;
  readonly reden: string;
};

export type GeoUitkomst = {
  readonly treffers: readonly GeoTreffer[];
  readonly afwijzingen: readonly GeoAfwijzing[];
};

/**
 * Namen waarvoor een hoofdletter niet genoeg is. Gemeten tegen de 342
 * gemeentenamen: vier tekens of korter, of ook een gewoon Nederlands
 * woord. Deze lijst is bewust expliciet in plaats van een regel over
 * woordlengte: "Oss" is kort maar nauwelijks dubbelzinnig, terwijl
 * "Bloemendaal" lang is en toch een gewone soortnaam.
 */
export const RISICONAMEN: ReadonlySet<string> = new Set([
  "Beek",
  "Best",
  "Bloemendaal",
  "Borne",
  "Buren",
  "Ede",
  "Epe",
  "Goes",
  "Heerde",
  "Laren",
  "Losser",
  "Meerssen",
  "Oss",
  "Raalte",
  "Sluis",
  "Stein",
  "Tiel",
  "Urk",
  "Zeist",
]);

/** Namen die zowel een gemeente als een provincie aanduiden. */
export const AMBIGUE_NAMEN: ReadonlySet<string> = new Set(["Groningen", "Utrecht"]);

/** Woorden die aangeven dat wat volgt een plaats of gebied is. */
const AANWIJZING_VOOR = [
  "gemeente",
  "gemeenten",
  "in",
  "te",
  "regio",
  "rondom",
  "nabij",
  "omgeving van",
  "provincie",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Een naampatroon waarin streepje en spatie uitwisselbaar zijn.
 * "Zuid-Holland" vindt dus ook "zuid holland" en "Zuid Holland" —
 * gemeten noodzakelijk, zie de toelichting bovenaan dit bestand.
 */
function naamPatroon(naam: string): string {
  // escapeRegex laat een streepje ongemoeid (die staat niet in de
  // escapeklasse), dus hier matchen op een KAAL streepje of witruimte.
  return escapeRegex(naam).replace(/[-\s]+/g, "[-\\s]+");
}

/** Staat er vlak vóór deze positie een aanwijzingswoord? */
function heeftAanwijzingVoor(tekst: string, index: number): string | null {
  const voor = tekst.slice(Math.max(0, index - 24), index).toLowerCase();
  for (const w of AANWIJZING_VOOR) {
    if (new RegExp(`\\b${escapeRegex(w)}\\s+$`).test(voor)) return w;
  }
  return null;
}

/** Staat er vlak ná de naam een aanwijzing zoals 'e.o.'? */
function heeftAanwijzingNa(tekst: string, einde: number): string | null {
  const na = tekst.slice(einde, einde + 12).toLowerCase();
  if (/^\s+e\.o\./.test(na)) return "e.o.";
  if (/^\s+en\s+omstreken/.test(na)) return "en omstreken";
  return null;
}

/**
 * Welk bestuurlijk niveau bedoelt de tekst bij een ambigue naam?
 * Kijkt in een venster vóór de naam naar het woord 'gemeente' of
 * 'provincie'. Geen van beide: null, en dan wordt er niets gebonden.
 */
function niveauVanAmbigu(tekst: string, index: number): GebiedSoort | null {
  const voor = tekst.slice(Math.max(0, index - 32), index).toLowerCase();
  const gemeente = voor.lastIndexOf("gemeente");
  const provincie = voor.lastIndexOf("provincie");
  if (gemeente === -1 && provincie === -1) return null;
  return gemeente > provincie ? "gemeente" : "provincie";
}

export type GebiedIndex = {
  readonly gemeenten: readonly Gebied[];
  readonly provincies: readonly Gebied[];
  readonly netbeheerders: readonly Gebied[];
};

/**
 * Herkent gebieden in titel en tekst.
 *
 * De titel weegt niet zwaarder dan de tekst — anders dan bij
 * onderwerpherkenning. Een gebied is een feit over waar iets speelt,
 * en dat feit is niet sterker omdat het in de kop staat. Wel wordt de
 * vindplaats in het bewijs vastgelegd, zodat een mens het kan nakijken.
 */
export function herkenGebieden(titel: string, tekst: string, index: GebiedIndex): GeoUitkomst {
  const treffers = new Map<string, GeoTreffer>();
  const afwijzingen: GeoAfwijzing[] = [];

  const velden: { naam: string; inhoud: string }[] = [
    { naam: "titel", inhoud: titel ?? "" },
    { naam: "tekst", inhoud: tekst ?? "" },
  ];

  const zet = (t: GeoTreffer) => {
    const sleutel = `${t.soort}:${t.code}`;
    const bestaand = treffers.get(sleutel);
    // Een sterkere grondslag verdringt een zwakkere.
    const rang = { bron_expliciet: 3, code_match: 2, afgeleid: 1 } as const;
    if (!bestaand || rang[t.grondslag] > rang[bestaand.grondslag]) treffers.set(sleutel, t);
  };

  for (const veld of velden) {
    const inhoud = veld.inhoud;
    if (!inhoud) continue;

    /* ---- 1. expliciete codes ---- */
    for (const m of inhoud.matchAll(/\bGM(\d{4})\b/g)) {
      const g = index.gemeenten.find((x) => x.code === m[1]);
      if (g) {
        zet({
          soort: "gemeente",
          code: g.code,
          naam: g.naam,
          grondslag: "code_match",
          bewijs: `expliciete gemeentecode ${m[0]} in de ${veld.naam}`,
        });
      }
    }
    for (const m of inhoud.matchAll(/\bPV(\d{2})\b/g)) {
      const p = index.provincies.find((x) => x.code === m[1] || x.code === `PV${m[1]}`);
      if (p) {
        zet({
          soort: "provincie",
          code: p.code,
          naam: p.naam,
          grondslag: "code_match",
          bewijs: `expliciete provinciecode ${m[0]} in de ${veld.naam}`,
        });
      }
    }

    /* ---- 2. netbeheerdergebieden: een expliciet genoemde beheerder ---- */
    for (const nb of index.netbeheerders) {
      // De eerste woorden van de officiële naam, zonder rechtsvorm.
      const kern = nb.naam.replace(/\b(N\.?V\.?|B\.?V\.?|Netbeheer|Infra)\b/gi, "").trim();
      if (kern.length < 4) continue;
      const re = new RegExp(`\\b${naamPatroon(kern)}\\b`, "i");
      const m = re.exec(inhoud);
      if (m) {
        zet({
          soort: "netbeheerdergebied",
          code: nb.code,
          naam: nb.naam,
          grondslag: "code_match",
          bewijs: `netbeheerder '${kern}' expliciet genoemd in de ${veld.naam}`,
        });
      }
    }

    /* ---- 3. provincienamen ---- */
    for (const p of index.provincies) {
      if (AMBIGUE_NAMEN.has(p.naam)) continue; // stap 5 behandelt die
      const re = new RegExp(`\\b${naamPatroon(p.naam)}\\b`, "i");
      if (re.test(inhoud)) {
        zet({
          soort: "provincie",
          code: p.code,
          naam: p.naam,
          grondslag: "code_match",
          bewijs: `provincienaam '${p.naam}' in de ${veld.naam}`,
        });
      }
    }

    /* ---- 4. gemeentenamen ---- */
    for (const g of index.gemeenten) {
      if (AMBIGUE_NAMEN.has(g.naam)) continue; // stap 5
      const risico = RISICONAMEN.has(g.naam);
      // Onduidelijke namen mogen in kleine letters; een risiconaam moet
      // exact gespeld staan, want daar is de hoofdletter het enige dat
      // de plaatsnaam van het gewone woord scheidt.
      const re = new RegExp(`\\b${naamPatroon(g.naam)}\\b`, risico ? "g" : "gi");
      for (const m of inhoud.matchAll(re)) {
        const pos = m.index ?? 0;
        if (!risico) {
          zet({
            soort: "gemeente",
            code: g.code,
            naam: g.naam,
            grondslag: "code_match",
            bewijs: `gemeentenaam '${g.naam}' in de ${veld.naam}`,
          });
          continue;
        }
        const voor = heeftAanwijzingVoor(inhoud, pos);
        const na = heeftAanwijzingNa(inhoud, pos + m[0].length);
        if (voor || na) {
          zet({
            soort: "gemeente",
            code: g.code,
            naam: g.naam,
            grondslag: "code_match",
            bewijs: `gemeentenaam '${g.naam}' met aanwijzing '${voor ?? na}' in de ${veld.naam}`,
          });
        } else {
          afwijzingen.push({
            naam: g.naam,
            reden:
              `'${g.naam}' is ook een gewoon woord of te kort om alleen op een hoofdletter te ` +
              `vertrouwen; er staat geen aanwijzing zoals 'gemeente ${g.naam}' of 'in ${g.naam}' ` +
              `in de ${veld.naam}`,
          });
        }
      }
    }

    /* ---- 5. ambigue namen: gemeente OF provincie ---- */
    for (const naam of AMBIGUE_NAMEN) {
      // Kleine letters toegestaan: de aanwijzing 'gemeente' of
      // 'provincie' is hier het onderscheid, niet de hoofdletter.
      const re = new RegExp(`\\b${naamPatroon(naam)}\\b`, "gi");
      for (const m of inhoud.matchAll(re)) {
        const niveau = niveauVanAmbigu(inhoud, m.index ?? 0);
        if (niveau === "gemeente") {
          const g = index.gemeenten.find((x) => x.naam === naam);
          if (g) {
            zet({
              soort: "gemeente",
              code: g.code,
              naam: g.naam,
              grondslag: "code_match",
              bewijs: `'${naam}' met het woord 'gemeente' ervoor in de ${veld.naam}`,
            });
          }
        } else if (niveau === "provincie") {
          const p = index.provincies.find((x) => x.naam === naam);
          if (p) {
            zet({
              soort: "provincie",
              code: p.code,
              naam: p.naam,
              grondslag: "code_match",
              bewijs: `'${naam}' met het woord 'provincie' ervoor in de ${veld.naam}`,
            });
          }
        } else {
          afwijzingen.push({
            naam,
            reden:
              `'${naam}' is zowel een gemeente als een provincie en er staat geen 'gemeente' of ` +
              `'provincie' bij in de ${veld.naam}. Er wordt niets gebonden: een gok op ` +
              "provincieniveau zou een gemeentelijk feit over de hele provincie uitsmeren.",
          });
        }
      }
    }
  }

  return { treffers: [...treffers.values()], afwijzingen };
}

/**
 * Van onderwerp naar impactsoort.
 *
 * `netcapaciteit` is de zwaarste: de database weigert die in
 * combinatie met grondslag 'afgeleid'
 * (constraint regio_impacts_netclaim_vereist_bronbewijs). Een
 * onderwerp dat hier niet in staat levert GEEN regio-impact — liever
 * niets dan een impact met een verzonnen soort.
 */
export const IMPACT_UIT_ONDERWERP: Readonly<Record<string, string>> = {
  netcongestie: "netcapaciteit",
  netbeheer: "netcapaciteit",
  subsidie: "subsidie",
  regelgeving: "regelgeving",
  marktprijs: "marktprijs",
  flexibiliteit: "marktprijs",
  laadinfrastructuur: "infrastructuur",
  bess: "infrastructuur",
  "zonne-energie": "infrastructuur",
  vastgoedverduurzaming: "vastgoedontwikkeling",
};

export function impactSoortVan(onderwerp: string | null): string | null {
  if (!onderwerp) return null;
  return IMPACT_UIT_ONDERWERP[onderwerp] ?? null;
}
