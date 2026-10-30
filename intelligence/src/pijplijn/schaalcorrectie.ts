/* ============================================================
   PIJPLIJN — schaalcorrectie
   ------------------------------------------------------------
   Zes uitspraken dragen een waarde die hun eigen schaal mist:
   `waarde_numeriek` is 235 terwijl de brontekst '€235 miljard'
   zegt. De semantische laag van 3.0.2 bewaarde de uitdrukking en het
   schaalwoord wel, dus de informatie is niet verdwenen — maar de
   numerieke waarde is onbruikbaar en gevaarlijk: wie hem zonder het
   schaalwoord verwoordt, publiceert '€235'.

   Deze module corrigeert dat NIET door de rij te overschrijven. De
   oude uitspraak blijft staan, er komt een nieuwe naast, en
   `intel.uitspraak_correcties` legt vast welke welke vervangt en
   waarom. Dat is dezelfde keten die een rectificatie van een
   aanbestedingstermijn gebruikt.

   ONAFHANKELIJK VAN DE ONTLEDER
   -----------------------------
   De detectie hier leest alleen `tekst` en `waarde_numeriek`. Ze
   gebruikt `uitdrukking` en `schaalwoord` met opzet NIET: dat zijn de
   velden die de ontleder zelf heeft geschreven, en een ontleder mag
   zijn eigen uitvoer niet goedkeuren. Wil je weten of 235 eigenlijk
   235 miljard is, dan moet dat uit de brontekst blijken, niet uit het
   veld dat bij dezelfde fout hoort.
   ============================================================ */

import type { Pool, PoolClient } from "pg";
import { metOrganisatie, rijen } from "../kern/db.ts";
import { herbeoordeelStand } from "./claimpoort.ts";

/** De schaalwoorden en hun factor. 'mln'/'mld' komen in persberichten voor. */
const SCHAALFACTOR: Readonly<Record<string, number>> = {
  duizend: 1e3,
  miljoen: 1e6,
  mln: 1e6,
  miljard: 1e9,
  mld: 1e9,
  /* 'biljoen' stond hier NIET, terwijl uitdrukking.ts het wel kent en
     rijmtMetUitdrukking() er ook op toetst. Een biljoen-schaalverlies
     werd dus nooit gevlagd, terwijl de ontleder het getal wel als 1e12
     kon lezen — en juist die asymmetrie tussen twee lagen is de klasse
     fout die PR #28 in de getalpatronen moest repareren. */
  biljoen: 1e12,
};

export type Schaalverlies = {
  /** Het schaalwoord zoals het in de brontekst naast het getal staat. */
  readonly schaalwoord: string;
  readonly factor: number;
  /** De waarde met de schaal erin. */
  readonly nieuweWaarde: number;
  /** Het fragment uit de brontekst dat dit bewijst. */
  readonly vindplaats: string;
};

function ontsnap(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Schrijft een getal in de vormen waarin het in Nederlandse tekst kan
 * staan: `1200` ook als `1.200`, en `3.5` ook als `3,5`.
 */
function schrijfwijzen(waarde: number): string[] {
  const uit = new Set<string>();
  const kaal = String(waarde);
  uit.add(kaal);
  if (kaal.includes(".")) uit.add(kaal.replace(".", ","));
  if (Number.isInteger(waarde) && Math.abs(waarde) >= 1000) {
    uit.add(waarde.toLocaleString("nl-NL"));
  }
  return [...uit];
}

/**
 * Staat het schaalwoord in de brontekst DIRECT naast deze waarde?
 *
 * Dit is bewust strenger dan 'komt het woord miljard ergens in de zin
 * voor'. Die ruimere toets vlagt ook een percentage in een zin die
 * verder over miljarden gaat: 'de netbeheerders investeren €200
 * miljard; het nettarief stijgt 8%' zou de 8 als schaalverlies
 * aanmerken en een correcte uitspraak afwijzen. Het schaalwoord hoort
 * bij een getal, niet bij een zin.
 */
export function vindSchaalverlies(tekst: string, waarde: number): Schaalverlies | null {
  if (!Number.isFinite(waarde) || waarde === 0) return null;
  const woorden = Object.keys(SCHAALFACTOR).join("|");
  for (const vorm of schrijfwijzen(Math.abs(waarde))) {
    /* Geen cijfer, punt of komma direct voor of na het getal: anders
       matcht de 3 uit '2035' of de 125 uit '1125'. Tussen getal en
       schaalwoord mag witruimte staan ('€ 3 miljard'). */
    const re = new RegExp(
      `(?<![\\d.,])${ontsnap(vorm)}(?![\\d.,])[\\s\\u00a0]{0,3}(${woorden})\\b\\.?`,
      "i",
    );
    const m = re.exec(tekst);
    if (!m) continue;
    const woord = m[1]!.toLowerCase();
    const factor = SCHAALFACTOR[woord]!;
    /* Zit de schaal al in de waarde, dan is er niets verloren. */
    if (Math.abs(waarde) >= factor) return null;
    const start = Math.max(0, m.index - 40);
    return {
      schaalwoord: woord,
      factor,
      nieuweWaarde: waarde * factor,
      vindplaats: tekst.slice(start, Math.min(tekst.length, m.index + m[0].length + 40)).trim(),
    };
  }
  return null;
}

/* ------------------------------------------------------------------
   HET BEWIJSOORDEEL — mag deze correctie een bewaard feit veranderen?

   De opdracht is: corrigeer uitsluitend feiten waarvoor GEZAGHEBBEND
   bronbewijs beschikbaar is, en laat onzekere correcties geblokkeerd.
   Tot 3.0.7 was `toepassen` alles-of-niets: elke gedetecteerde correctie
   werd aangebracht.

   De vier criteria zijn alle vier MEETBAAR, en elk levert zijn eigen
   reden op. Niets hiervan verzwakt de detectie — het oordeel staat
   ERNA en kan alleen minder toepassen, nooit meer.

   WAAROM CRITERIUM a BESTAAT. De verkenning van 14 oktober 2026 heeft
   gemeten dat meten op een AFGEKAPT venster een valse positief geeft:

     vindSchaalverlies("De opgave bedraagt 1235 miljard eenheden
                        volgens het rapport.", 235)            -> null
     dezelfde aanroep op heel.slice(20)                        -> treffer

   De linkergrens in vindSchaalverlies kan niet kijken naar tekens die
   door het venster zijn weggesneden; aan het begin van een string
   slaagt de lookbehind altijd. Dat is exact dezelfde klasse fout als de
   parserbug van PR #28, nu veroorzaakt door de MEETMETHODE. Daarom
   herrekent dit oordeel op de VOLLEDIGE tekst en legt het vast dat het
   dat gedaan heeft.

   WAT DIT NIET DOET: het beoordeelt de SCHAAL, niet de bewering. Of een
   bedrag voorwaardelijk is ("kunnen beperken") of een ondergrens is
   ("ruim"), is een verwoordbaarheidsvraag en staat in semantiek.ts. Een
   correctie haalt een onwaar GETAL uit de rijenstroom; ze maakt geen
   publiceerbaar feit.
   ------------------------------------------------------------------ */

export type Bewijsklasse = "GEZAGHEBBEND" | "ONZEKER";

export type Bewijsoordeel = {
  readonly klasse: Bewijsklasse;
  readonly redenen: readonly string[];
};

/* De eenheidsklassen staan hier LOKAAL en worden niet uit
   uitdrukking.ts geimporteerd. De kop van dit bestand legt uit waarom:
   een ontleder mag zijn eigen uitvoer niet goedkeuren, en deze module
   houdt daarom nul import naar de ontleedlaag. Het is een korte lijst
   die bij afwijken aantoonbaar faalt in schaalbewijs.test.ts. */
const EENHEID_GELD = new Set(["EUR", "EUR/MWh", "ct/kWh"]);
const EENHEID_ENERGIE = new Set(["kWh", "MWh", "GWh"]);
const EENHEID_VERMOGEN = new Set(["kW", "MW", "GW", "kWp", "MWp", "Wp", "kVA", "MVA"]);

/** Fenomenen waarbij een bedrag zonder tijdgrens een andere bewering is. */
const TIJDGEBONDEN_FENOMENEN = new Set([
  "netinvestering",
  "subsidiebudget",
  "subsidiebedrag",
  "opdrachtwaarde",
]);

export function beoordeelSchaalbewijs(invoer: {
  /** De VOLLEDIGE tekst van de uitspraak, niet een venster eruit. */
  readonly tekst: string;
  readonly oudeWaarde: number;
  readonly eenheid: string | null;
  readonly fenomeen: string | null;
  readonly horizon: string | null;
  readonly periode: string | null;
  readonly isPrimaireBron: boolean;
}): Bewijsoordeel {
  const redenen: string[] = [];
  let klasse: Bewijsklasse = "GEZAGHEBBEND";
  const faal = (reden: string) => {
    klasse = "ONZEKER";
    redenen.push(reden);
  };

  /* a. HERREKENEN OP DE VOLLEDIGE TEKST. */
  const opHeel = vindSchaalverlies(invoer.tekst, invoer.oudeWaarde);
  if (!opHeel) {
    faal(
      "op de VOLLEDIGE uitspraaktekst is geen schaalverlies te meten; een treffer op een " +
        "afgekapt venster bewijst niets, want aan het begin van een venster slaagt de " +
        "linkergrens altijd",
    );
  } else {
    redenen.push(
      `het schaalwoord '${opHeel.schaalwoord}' staat in de volledige brontekst direct naast ` +
        `het getal: "${opHeel.vindplaats}"`,
    );
  }

  /* b. DE EENHEID. Een percentage of een lege eenheid met een
     schaalwoord is geen schaalverlies maar een leesfout. */
  const e = (invoer.eenheid ?? "").trim();
  if (!e) {
    faal("de uitspraak heeft geen eenheid; zonder eenheid is een factor 1000 niet te duiden");
  } else if (EENHEID_GELD.has(e)) {
    redenen.push(`eenheid '${e}' is een geldeenheid`);
  } else if (EENHEID_ENERGIE.has(e) || EENHEID_VERMOGEN.has(e)) {
    redenen.push(`eenheid '${e}' is een energie- of vermogenseenheid`);
  } else {
    faal(
      `eenheid '${e}' is geen geld-, energie- of vermogenseenheid; een schaalwoord naast zo'n ` +
        "getal is eerder een leesfout dan een verloren factor",
    );
  }

  /* c. DE BRON. Een overnemer kan een getal verkeerd hebben
     overgeschreven; dan corrigeren we een fout naar een andere fout. */
  if (invoer.isPrimaireBron) {
    redenen.push("de uitspraak hangt aan een PRIMAIRE bron");
  } else {
    faal(
      "de uitspraak hangt niet aan een primaire bron; bij een overnemer is niet vast te stellen " +
        "of het schaalwoord in de oorspronkelijke publicatie net zo stond",
    );
  }

  /* d. DE TIJDGRENS, alleen waar hij de bewering verandert. */
  if (invoer.fenomeen && TIJDGEBONDEN_FENOMENEN.has(invoer.fenomeen)) {
    if (invoer.horizon || invoer.periode) {
      redenen.push(
        `tijdgebonden fenomeen '${invoer.fenomeen}' met ` +
          `${invoer.horizon ? `horizon '${invoer.horizon}'` : `periode '${invoer.periode}'`}`,
      );
    } else {
      faal(
        `fenomeen '${invoer.fenomeen}' is tijdgebonden en heeft geen horizon en geen periode; ` +
          "een gecorrigeerd bedrag zonder tijdgrens leest als een jaarbedrag en is dan een " +
          "andere bewering dan de bron doet",
      );
    }
  }

  return { klasse, redenen };
}

type UitspraakRij = {
  id: number;
  gebeurtenis_id: number | null;
  tekst: string;
  waarde_numeriek: string | null;
  eenheid: string | null;
  verificatie_status: string;
  fenomeen: string | null;
  schaalwoord: string | null;
  uitdrukking: string | null;
  horizon: string | null;
  periode: string | null;
  is_primaire_bron: boolean;
};

export type SchaalcorrectieRapport = {
  readonly bekeken: number;
  readonly gevonden: number;
  readonly aangebracht: number;
  readonly overgeslagen: number;
  /**
   * Hoeveel claims er na deze ronde op herbeoordeling wachten.
   *
   * Niet nul betekent dat de claimpoort DICHT staat en dat de
   * besluitmotor, de nieuwsselectie, de voorstellenlaag en de
   * conceptgeneratie weigeren tot `npm run herbeoordeel` heeft
   * gedraaid. Staat hier een getal, dan hoort de aanroeper dat te
   * melden — niet omdat het onveilig is, maar omdat een stilstaand
   * nieuwskanaal zichtbaar moet zijn.
   */
  readonly claimpoortOpenstaand: number;
  readonly regels: readonly {
    readonly uitspraakId: number;
    readonly gebeurtenisId: number | null;
    readonly oudeWaarde: number;
    readonly nieuweWaarde: number;
    readonly eenheid: string | null;
    readonly schaalwoord: string;
    readonly vindplaats: string;
    readonly vervangerId: number | null;
    readonly reden: string;
    /** GEZAGHEBBEND of ONZEKER; alleen het eerste wordt toegepast. */
    readonly bewijsklasse: Bewijsklasse;
    readonly bewijsredenen: readonly string[];
    readonly horizon: string | null;
    readonly periode: string | null;
  }[];
  /** Hoeveel correcties zijn GEBLOKKEERD omdat het bewijs onzeker is. */
  readonly geblokkeerd: number;
};

/**
 * Corrigeert schaalverlies via de append-only keten.
 *
 * Droog (de standaard) meet alleen. `toepassen` schrijft, en dan
 * uitsluitend door TOE TE VOEGEN: een nieuwe uitspraak met de volledige
 * waarde, dezelfde bronkoppeling, en een correctieregel die naar de
 * oude wijst. Er wordt niets ge-update en niets verwijderd, dus de
 * oorspronkelijke waarde en de reden blijven allebei navraagbaar.
 *
 * Idempotent: een uitspraak die al een rectificatie heeft, wordt
 * overgeslagen.
 */
export async function herstelSchaal(
  pool: Pool,
  organisatieId: number,
  opties: { toepassen?: boolean } = {},
): Promise<SchaalcorrectieRapport> {
  const toepassen = opties.toepassen === true;
  return metOrganisatie(pool, { organisatieId }, async (c: PoolClient) => {
    const alle = await rijen<UitspraakRij>(
      c,
      /* `horizon`, `periode` en `is_primaire_bron` zijn erbij gekomen voor
         beoordeelSchaalbewijs: zonder die drie kan het oordeel criterium
         c en d niet meten en zou het alles GEZAGHEBBEND noemen. */
      `select u.id, u.gebeurtenis_id, u.tekst, u.waarde_numeriek::text as waarde_numeriek,
              u.eenheid, u.verificatie_status, u.fenomeen, u.schaalwoord, u.uitdrukking,
              u.horizon, u.periode,
              coalesce(bool_or(b.is_primaire_bron), false) as is_primaire_bron
         from intel.uitspraken u
         left join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
         left join intel.brondocument_versies bv on bv.id = ub.versie_id
         left join intel.brondocumenten bd on bd.id = bv.brondocument_id
         left join intel.bronnen b on b.id = bd.bron_id
        where u.organisatie_id = $1
          and u.waarde_numeriek is not null
          /* Al gerectificeerd? Dan is deze rij geschiedenis. */
          and not exists (
            select 1 from intel.uitspraak_correcties k
             where k.vervangen_id = u.id and k.soort = 'rectificatie')
        group by u.id
        order by u.id`,
      [organisatieId],
    );

    const regels: SchaalcorrectieRapport["regels"][number][] = [];
    let aangebracht = 0;
    let overgeslagen = 0;
    let geblokkeerd = 0;

    for (const u of alle) {
      const oud = Number(u.waarde_numeriek);
      const verlies = vindSchaalverlies(u.tekst, oud);
      if (!verlies) continue;

      /* HET BEWIJSOORDEEL. Staat NA de detectie, dus het kan alleen
         minder toepassen en nooit meer. ONZEKER blijft open, komt met
         zijn redenen in het rapport en wordt NIET geschreven. */
      const bewijs = beoordeelSchaalbewijs({
        tekst: u.tekst,
        oudeWaarde: oud,
        eenheid: u.eenheid,
        fenomeen: u.fenomeen,
        horizon: u.horizon,
        periode: u.periode,
        isPrimaireBron: u.is_primaire_bron,
      });

      /* Bestaat de gecorrigeerde uitspraak al, dan niets toevoegen.
         De tekst hoort in deze vergelijking, en dat is geen detail:
         gebeurtenis 69 heeft twee uitspraken van € 3 miljard — één uit
         de titel en één uit de body. Op waarde alleen zou de tweede
         voor een duplicaat van de eerste worden aangezien en
         ongecorrigeerd achterblijven, waarmee de poort de gebeurtenis
         alsnog op die ene rij afwijst. */
      const bestaat = await rijen<{ id: number }>(
        c,
        `select id from intel.uitspraken
          where organisatie_id = $1 and gebeurtenis_id is not distinct from $2
            and eenheid is not distinct from $3 and waarde_numeriek = $4
            and tekst = $5
          limit 1`,
        [organisatieId, u.gebeurtenis_id, u.eenheid, verlies.nieuweWaarde, u.tekst],
      );
      if (bestaat.length > 0) {
        overgeslagen++;
        regels.push({
          uitspraakId: u.id,
          gebeurtenisId: u.gebeurtenis_id,
          oudeWaarde: oud,
          nieuweWaarde: verlies.nieuweWaarde,
          eenheid: u.eenheid,
          schaalwoord: verlies.schaalwoord,
          vindplaats: verlies.vindplaats,
          bewijsklasse: bewijs.klasse,
          bewijsredenen: bewijs.redenen,
          horizon: u.horizon,
          periode: u.periode,
          vervangerId: bestaat[0]!.id,
          reden: `overgeslagen: uitspraak ${bestaat[0]!.id} draagt deze waarde al`,
        });
        continue;
      }

      /* DE GRENDEL. Een onzeker bewijs wordt NIET geschreven, ook niet
         met toepassen:true. De regel komt in het rapport zodat een mens
         ziet wat er open blijft en waarom — geblokkeerd is niet
         hetzelfde als onopgemerkt. */
      if (bewijs.klasse === "ONZEKER") {
        geblokkeerd++;
        regels.push({
          uitspraakId: u.id,
          gebeurtenisId: u.gebeurtenis_id,
          oudeWaarde: oud,
          nieuweWaarde: verlies.nieuweWaarde,
          eenheid: u.eenheid,
          schaalwoord: verlies.schaalwoord,
          vindplaats: verlies.vindplaats,
          bewijsklasse: bewijs.klasse,
          bewijsredenen: bewijs.redenen,
          horizon: u.horizon,
          periode: u.periode,
          vervangerId: null,
          reden: `GEBLOKKEERD, bewijs onzeker: ${bewijs.redenen.join(" | ")}`,
        });
        continue;
      }

      if (!toepassen) {
        regels.push({
          uitspraakId: u.id,
          gebeurtenisId: u.gebeurtenis_id,
          oudeWaarde: oud,
          nieuweWaarde: verlies.nieuweWaarde,
          eenheid: u.eenheid,
          schaalwoord: verlies.schaalwoord,
          vindplaats: verlies.vindplaats,
          bewijsklasse: bewijs.klasse,
          bewijsredenen: bewijs.redenen,
          horizon: u.horizon,
          periode: u.periode,
          vervangerId: null,
          reden: "droog: niets geschreven",
        });
        continue;
      }

      /* DE NIEUWE UITSPRAAK.
         Alles overnemen behalve de waarde en de afgeleide velden die
         van de waarde afhangen. `verwoordbaar` en `verwoorde_zin`
         blijven leeg: die hoort de verwoordbaarheidspoort opnieuw te
         bepalen, niet deze module. Dat is dezelfde regel als in
         migratie 0025.

         ------------------------------------------------------------
         DE R3-VELDEN GAAN MEE, EN DAT IS PER VELD AFGEWOGEN.

         Hier stonden ze NIET in de kolomlijst. Gevolg: de kloon kreeg
         `verificatie_status = 'bevestigd'` en `bewijs_kwaliteit` mee,
         maar `modaliteit_versie` werd NULL. Daarmee viel hij in
         WACHT_OP_HERBEOORDELING_SQL en ging de claimpoort DICHT: de
         besluitmotor, de nieuwsselectie, de voorstellenlaag en de
         conceptgeneratie weigerden tot er opnieuw een herbeoordeling
         was gedraaid. Dat is fail-closed en dus veilig, maar het legt
         het nieuwskanaal stil na een handeling die daar niets mee te
         maken heeft. Sectie 3 van de acceptatieopdracht eist precies
         dat dat niet ongemerkt gebeurt.

         WAAROM OVERNEMEN SEMANTISCH JUIST IS. Deze module verandert
         ALLEEN `waarde_numeriek` en de daarvan afgeleide bereikgrenzen.
         De `tekst` gaat letterlijk mee. En:

           * `modaliteit`, `modaliteit_zekerheid`, `modaliteit_versie`
             en `modaliteit_grondslag` worden door bepaalModaliteit()
             afgeleid uit de TEKST en de publicatiedatum van het
             brondocument. Geen van beide verandert hier, dus hetzelfde
             oordeel is niet gekopieerd maar gelijk.
           * `bewijskracht_plafond` is een functie van documentsoort x
             gezag. Die staan op brondocument_versies, en de kloon
             krijgt dezelfde primaire binding. Ook gelijk.

         WAT NIET MEEGAAT: `oordeel_bron`. Als een MENS het origineel
         heeft beoordeeld, geldt dat oordeel voor de oude waarde. De
         kloon is een nieuwe rij met een andere waarde, door de machine
         gemaakt. Hem 'mens' meegeven zou hem afschermen van de
         herverwerking zonder dat iemand naar het nieuwe getal heeft
         gekeken — en dat is precies de stille herbevestiging die de
         opdracht verbiedt. Hij komt daarom op 'motor'.

         EN ALS HET ORIGINEEL ZELF NOG NIET IS HERBEOORDEELD, dan erft
         de kloon een lege `modaliteit_versie` en gaat de poort alsnog
         dicht. Dat hoort zo: dan is er werkelijk iets te wegen. Het
         rapport telt die gevallen apart en de CLI noemt de
         vervolgactie, zodat het niet stil gebeurt. */
      const nieuw = await rijen<{ id: number }>(
        c,
        `insert into intel.uitspraken (
           organisatie_id, gebeurtenis_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
           geldig_vanaf, geldig_tot, hersien_voor, laatst_geverifieerd_op,
           verificatie_status, bewijs_kwaliteit, risico_klasse,
           is_interpretatie, interpretatie_door, vertrouwen,
           semantiek_soort, fenomeen, subject, richting, grondtal, uitdrukking, exactheid,
           bereik_min, bereik_max, schaalwoord, geo_bereik, periode, periode_van, periode_tot,
           bron_vindplaats, voorwaarden, uitzonderingen, vergelijkingsbasis,
           semantiek_herkomst, scope_waarschuwing, horizon,
           modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
           bewijskracht_plafond, oordeel_bron)
         select organisatie_id, gebeurtenis_id, tekst, soort, $2::numeric, eenheid, onderwerp,
                geldig_vanaf, geldig_tot, hersien_voor, laatst_geverifieerd_op,
                verificatie_status, bewijs_kwaliteit, risico_klasse,
                is_interpretatie, interpretatie_door, vertrouwen,
                semantiek_soort, fenomeen, subject, richting, grondtal, uitdrukking, exactheid,
                case when bereik_min is null then null else bereik_min * $3::numeric end,
                case when bereik_max is null then null else bereik_max * $3::numeric end,
                schaalwoord, geo_bereik, periode, periode_van, periode_tot,
                bron_vindplaats, voorwaarden, uitzonderingen, vergelijkingsbasis,
                /* semantiek_herkomst ONGEWIJZIGD overnemen. Dat veld zegt
                   waar de SEMANTIEK vandaan komt, en die wordt hier niet
                   opnieuw afgeleid — alleen de waarde wordt gecorrigeerd.
                   Er 'schaalcorrectie' van maken zou de herkomst van het
                   fenomeen en het subject verkeerd opschrijven; waarom de
                   waarde veranderde staat in de grondslag van de
                   correctieregel, en dat is de plek ervoor. */
                semantiek_herkomst, scope_waarschuwing, horizon,
                /* Het modaliteitsoordeel en het plafond gaan mee; zie de
                   afweging per veld in de comment hierboven. */
                modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
                bewijskracht_plafond,
                /* EN HET MENSELIJK OORDEEL GAAT NIET MEE. Vast op
                   'motor': de kloon is machinewerk op een nieuwe
                   waarde, en een geërfd mensoordeel zou hem afschermen
                   van de herverwerking zonder dat iemand ernaar heeft
                   gekeken. */
                'motor'
           from intel.uitspraken where id = $1
         returning id`,
        [u.id, verlies.nieuweWaarde, verlies.factor],
      );
      const vervangerId = nieuw[0]!.id;

      /* DEZELFDE BRONNEN. Zonder primaire bronversie mag een uitspraak
         niet 'bevestigd' zijn; die koppeling moet dus mee. */
      await c.query(
        `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol, vindplaats, citaat)
         select organisatie_id, $2, versie_id, rol, vindplaats, citaat
           from intel.uitspraak_bronnen where uitspraak_id = $1`,
        [u.id, vervangerId],
      );

      const grondslag =
        `Schaalcorrectie: de brontekst zet '${verlies.schaalwoord}' direct naast het getal, ` +
        `maar de bewaarde waarde was ${oud}${u.eenheid ? ` ${u.eenheid}` : ""} en mist die factor ` +
        `${verlies.factor}. Nieuwe waarde ${verlies.nieuweWaarde}${u.eenheid ? ` ${u.eenheid}` : ""}. ` +
        `Vindplaats in de bron: "${verlies.vindplaats}". De oude uitspraak ${u.id} blijft ongewijzigd staan.`;

      await c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1, $2, $3, 'rectificatie', $4)`,
        [organisatieId, u.id, vervangerId, grondslag],
      );

      aangebracht++;
      regels.push({
        uitspraakId: u.id,
        gebeurtenisId: u.gebeurtenis_id,
        oudeWaarde: oud,
        nieuweWaarde: verlies.nieuweWaarde,
        eenheid: u.eenheid,
        schaalwoord: verlies.schaalwoord,
        vindplaats: verlies.vindplaats,
        bewijsklasse: bewijs.klasse,
        bewijsredenen: bewijs.redenen,
        horizon: u.horizon,
        periode: u.periode,
        vervangerId,
        reden: grondslag,
      });
    }

    /* STAAT DE CLAIMPOORT NU DICHT DOOR DEZE RONDE?
       De kloon neemt het modaliteitsoordeel van het origineel over, dus
       in het normale geval verandert er niets aan de poort. Maar als
       het origineel zelf nog niet onder de huidige motorversie was
       gewogen, erft de kloon die leegte en gaat de poort dicht. Dan
       hoort dat GETELD en GENOEMD te worden en niet pas gevonden te
       worden als de volgende pijplijnronde weigert: de opdracht eist
       dat de nieuwsengine niet ongemerkt stilvalt.
       Na een droge ronde is dit de stand van vóór de ronde, en dat is
       precies wat een operator wil weten voordat hij toepast. */
    const poort = await herbeoordeelStand(c, organisatieId);

    return {
      bekeken: alle.length,
      gevonden: regels.length,
      aangebracht,
      overgeslagen,
      geblokkeerd,
      claimpoortOpenstaand: poort.openstaand,
      regels,
    };
  });
}
