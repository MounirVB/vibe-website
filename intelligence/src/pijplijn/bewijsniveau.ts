/* ============================================================
   PIJPLIJN — het BEWIJSNIVEAU van een claim
   ------------------------------------------------------------
   HET GEMETEN GAT, 6 november 2026, en het is de flessenhals van het
   hele nieuwskanaal.

   Vijf echte gebeurtenissen door de keten gaven 15 ruwe claims en
   NUL bevestigde. Alle vijftien vielen af op VERIFICATIE_NODIG, en de
   oorzaak is structureel:

     energie-nederland-nieuws      SECUNDAIRE_BERICHTGEVING / BELANGEN-
                                   BEHARTIGER, plafond 2
     netbeheer-nederland-nieuws    idem, plafond 2
     nkl-laadinfra                 FEITELIJKE_MEDEDELING / BELANGEN-
                                   BEHARTIGER, plafond 3

   Geen van die drie mag zichzelf bevestigen, en dat is juist: een
   branchevereniging is niet de bron van het recht. Van de 4.352
   bronversies in productie is er 111 — 2,6% — van een soort die
   zichzelf kan bevestigen.

   Er bestond dus maar één weg naar 'bevestigd': verifieerBijGezag()
   het origineel laten vinden bij het bevoegd gezag. Dat werkt alleen
   als de navertelling dat gezag NOEMT (`beschrijfBesluitVan`), en dat
   doet een bericht over netcongestie zelden.

   ------------------------------------------------------------
   WAT DEZE MODULE TOEVOEGT

   Vijf niveaus, letterlijk de vijf uit §3:

     DIRECT_BEVESTIGD          een primaire bron met gezag noemt dit
                               feit in zijn eigen publicatie
     MEERVOUDIG_BEVESTIGD      meerdere ONAFHANKELIJKE bronnen melden
                               dezelfde bewering
     ALLEEN_BELANGENBEHARTIGING het feit komt uitsluitend uit
                               belangenbehartiging
     NIET_BEVESTIGD            er is geen tweede waarneming
     TEGENSTRIJDIG             twee bronnen melden dezelfde grootheid
                               met een andere waarde

   ------------------------------------------------------------
   DRIE DINGEN DIE HIER NIET GEBEUREN

   1 GEEN DREMPEL GAAT OMLAAG. Dit niveau is een LABEL naast de
     bestaande verificatiestatus en vervangt hem niet. Alleen
     DIRECT_BEVESTIGD rechtvaardigt 'bevestigd', en dat besluit blijft
     waar het stond: in uitspraken.ts en bronverificatie.ts, onder
     dezelfde voorwaarden als gisteren.

     MEERVOUDIG_BEVESTIGD is met opzet GEEN grond voor 'bevestigd'.
     Drie branchepartijen die elkaar naschrijven zijn drie
     waarnemingen van één persbericht, geen drie bewijzen. Het niveau
     zegt wat het is — meerdere onafhankelijke bronnen melden dit — en
     de redactie weegt dat zelf.

   2 TWEE VERSIES VAN ÉÉN BRON ZIJN ÉÉN WAARNEMING. De opdracht noemt
     dit met naam. Onafhankelijkheid wordt daarom geteld op
     BRONSLEUTEL, niet op bronversie en niet op brondocument: een
     document dat twee keer is opgehaald is één document, en twee
     documenten van dezelfde uitgever zijn één bron.

   3 GEEN SAMENVOEGING. Deze module leest en telt; hij schrijft geen
     claim weg en verwijdert er geen.

   PUUR in zijn beslisregel: bepaalBewijsniveau() krijgt de
   waarnemingen mee en doet geen query. De query staat apart in
   leesWaarnemingen(), zodat de regel zonder database te toetsen is.
   ============================================================ */

import type pg from "pg";
import { rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import type { Gezag } from "./documentsoort.ts";
import { vraagOmBeoordeling } from "./claimbeoordeling.ts";

const log = maakLogger("bewijsniveau");

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const BEWIJSNIVEAU_VERSIE = "bewijsniveau-v1";

export type Bewijsniveau =
  | "DIRECT_BEVESTIGD"
  | "MEERVOUDIG_BEVESTIGD"
  | "ALLEEN_BELANGENBEHARTIGING"
  | "NIET_BEVESTIGD"
  | "TEGENSTRIJDIG";

export const BEWIJSNIVEAU_LABEL: Readonly<Record<Bewijsniveau, string>> = {
  DIRECT_BEVESTIGD: "Direct bevestigd door een primaire bron",
  MEERVOUDIG_BEVESTIGD: "Bevestigd door meerdere onafhankelijke bronnen",
  ALLEEN_BELANGENBEHARTIGING: "Alleen uit belangenbehartiging",
  NIET_BEVESTIGD: "Niet bevestigd",
  TEGENSTRIJDIG: "Tegenstrijdige bronnen",
};

/**
 * Eén waarneming van een bewering: één claimrij, met de bron eronder.
 *
 * `bronSleutel` IS de eenheid van onafhankelijkheid. Zie punt 2 in de
 * kop: niet de versie, niet het document, maar de bron.
 */
export type Waarneming = {
  readonly uitspraakId: number;
  readonly bronSleutel: string;
  readonly brondocumentId: number;
  readonly versieId: number;
  readonly gezag: Gezag | string | null;
  readonly documentsoort: string | null;
  /** Mocht dit stuk zijn eigen claim bevestigen? */
  readonly magZelfBevestigen: boolean;
  readonly verificatieStatus: string;
  readonly waardeNumeriek: number | null;
  readonly eenheid: string | null;
};

export type BewijsniveauUitslag = {
  readonly niveau: Bewijsniveau;
  readonly reden: string;
  /** Hoeveel ONAFHANKELIJKE bronnen deze bewering melden. */
  readonly onafhankelijkeBronnen: number;
  /** De bronsleutels, gesorteerd, voor het auditspoor. */
  readonly bronnen: readonly string[];
  /** Hoeveel waarnemingen er in totaal zijn, inclusief dubbele versies. */
  readonly waarnemingen: number;
  readonly versie: string;
};

/* ------------------------------------------------------------------
   WELK GEZAG IS BELANGENBEHARTIGING

   Uit intel.bronnen.uitgever_soort via gezagVan(); hier staan de namen
   zoals documentsoort.ts ze gebruikt. BELANGENBEHARTIGER is de enige
   die §3 als "alleen belangenbehartiging" bedoelt; MARKT is een
   marktpartij en STATISTIEK een statistiekbureau, en die vallen onder
   'niet bevestigd' en niet onder belangenbehartiging.
   ------------------------------------------------------------------ */
const BELANGENBEHARTIGING = "BELANGENBEHARTIGER";

/**
 * Bepaalt het bewijsniveau van één bewering uit haar waarnemingen.
 *
 * DE ORDE IS BEWUST:
 *
 *   1 TEGENSTRIJDIG eerst. Een tegenspraak is het belangrijkste feit
 *     dat we over een bewering kunnen weten; hij mag niet verdwijnen
 *     achter een bevestiging uit een derde bron.
 *   2 DIRECT_BEVESTIGD daarna, want dat is de enige grond die een
 *     claim werkelijk draagt.
 *   3 MEERVOUDIG_BEVESTIGD boven ALLEEN_BELANGENBEHARTIGING: drie
 *     onafhankelijke branchepartijen zeggen meer dan één, ook al is
 *     geen van de drie een primaire bron.
 *   4 ALLEEN_BELANGENBEHARTIGING boven NIET_BEVESTIGD, want "we weten
 *     waar dit vandaan komt" is meer dan "we weten het niet".
 */
export function bepaalBewijsniveau(
  waarnemingen: readonly Waarneming[],
): BewijsniveauUitslag {
  const bronnen = [...new Set(waarnemingen.map((w) => w.bronSleutel))].sort();
  const basis = {
    onafhankelijkeBronnen: bronnen.length,
    bronnen,
    waarnemingen: waarnemingen.length,
    versie: BEWIJSNIVEAU_VERSIE,
  };
  if (waarnemingen.length === 0) {
    return {
      ...basis,
      niveau: "NIET_BEVESTIGD",
      reden: "er is geen enkele waarneming van deze bewering",
    };
  }

  /* 1 · TEGENSPRAAK.
     ----------------------------------------------------------------
     Twee waarnemingen met DEZELFDE eenheid en een ANDERE waarde, uit
     VERSCHILLENDE bronnen. Dezelfde bron die zichzelf tegenspreekt is
     geen tegenspraak tussen bronnen maar een correctie, en die hoort
     via intel.uitspraak_correcties te gaan.

     Let op: de afdruk van een claim bevat de waarde, dus twee claims
     met een andere waarde hebben per definitie een andere afdruk en
     komen hier niet samen binnen. Deze toets werkt daarom op een
     BREDERE groepering — zelfde onderwerp en eenheid — die de
     aanroeper meegeeft. Zonder zo'n groepering is het antwoord
     eenvoudig 'geen tegenspraak gezien', en dat is eerlijk. */
  const metWaarde = waarnemingen.filter(
    (w) => w.waardeNumeriek !== null && w.eenheid !== null,
  );
  for (const a of metWaarde) {
    for (const b of metWaarde) {
      if (a.bronSleutel === b.bronSleutel) continue;
      if (a.eenheid !== b.eenheid) continue;
      if (a.waardeNumeriek === b.waardeNumeriek) continue;
      return {
        ...basis,
        niveau: "TEGENSTRIJDIG",
        reden:
          `${a.bronSleutel} meldt ${a.waardeNumeriek} ${a.eenheid} en ${b.bronSleutel} meldt ` +
          `${b.waardeNumeriek} ${b.eenheid} voor dezelfde grootheid. Een tegenspraak tussen ` +
          `bronnen is geen bevestiging en ook geen afwijzing: een mens hoort te kijken.`,
      };
    }
  }

  /* 2 · DIRECT BEVESTIGD.
     Een waarneming uit een stuk dat zijn eigen claim MAG bevestigen en
     dat ook is, of een claim die bronverificatie.ts bij het gezag heeft
     teruggevonden. Beide staan in verificatie_status 'bevestigd'; het
     onderscheid is of het stuk het zelf mocht. */
  const direct = waarnemingen.filter(
    (w) => w.verificatieStatus === "bevestigd" && w.magZelfBevestigen,
  );
  if (direct.length > 0) {
    const w = direct[0]!;
    return {
      ...basis,
      niveau: "DIRECT_BEVESTIGD",
      reden:
        `bron ${w.bronSleutel} (${w.documentsoort ?? "soort onbekend"} / ${w.gezag ?? "gezag onbekend"}) ` +
        `noemt dit feit in zijn eigen publicatie en mag het daarmee vaststellen`,
    };
  }

  /* 3 · MEERVOUDIG BEVESTIGD — en de telling is op BRON.
     ----------------------------------------------------------------
     Dit is de plek waar de opdracht expliciet waarschuwt: "Voorkom dat
     twee versies van dezelfde bron als twee onafhankelijke
     bevestigingen worden geteld." `bronnen` is een Set over
     bronSleutel, dus twee versies van één document geven er één, en
     twee documenten van dezelfde uitgever ook. */
  if (bronnen.length >= 2) {
    return {
      ...basis,
      niveau: "MEERVOUDIG_BEVESTIGD",
      reden:
        `${bronnen.length} onafhankelijke bronnen melden dezelfde bewering ` +
        `(${bronnen.join(", ")}) uit ${waarnemingen.length} waarneming(en). GEEN van hen is ` +
        `een primaire bron met gezag, dus dit is geen vaststelling — het is een sterker ` +
        `signaal dan één bron en niet meer dan dat.`,
    };
  }

  /* 4 · ALLEEN BELANGENBEHARTIGING. */
  const alleBelangen = waarnemingen.every((w) => w.gezag === BELANGENBEHARTIGING);
  if (alleBelangen) {
    return {
      ...basis,
      niveau: "ALLEEN_BELANGENBEHARTIGING",
      reden:
        `de enige bron is ${bronnen[0]}, een belangenbehartiger. Zo'n partij mag melden wat ` +
        `zij vindt en wat zij ziet, maar is niet de bron van het feit. Er is geen tweede, ` +
        `onafhankelijke waarneming.`,
    };
  }

  /* 5 · NIET BEVESTIGD. */
  return {
    ...basis,
    niveau: "NIET_BEVESTIGD",
    reden:
      `één waarneming, uit ${bronnen[0]}, en die mag zijn eigen claim niet vaststellen. ` +
      `Er is geen tweede bron en geen origineel bij een bevoegd gezag gevonden.`,
  };
}

/* ==================================================================
   DE WAARNEMINGEN UIT DE DATABASE
   ------------------------------------------------------------------
   APART VAN DE BESLISREGEL, zodat die regel zonder database te toetsen
   is. Deze functie doet geen oordeel; hij haalt op.
   ================================================================== */

/**
 * Alle waarnemingen van één claimafdruk.
 *
 * DE AFDRUK IS DE SLEUTEL, niet de tekst. Twee bronnen schrijven
 * dezelfde bewering nooit woordelijk hetzelfde op, maar de afdruk bevat
 * de kern van de bewering (zie claimidentiteit.ts) en bindt ze dus
 * alleen wanneer die kern gelijk is. Dat is streng: een
 * geherformuleerde bewering wordt NIET als dezelfde geteld. Zie de
 * toelichting daar waarom dat de goedkope kant van de fout is.
 */
export async function leesWaarnemingen(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  afdruk: string,
): Promise<Waarneming[]> {
  return rijen<Waarneming>(
    c,
    `select u.id                      as "uitspraakId",
            b.sleutel                 as "bronSleutel",
            bv.brondocument_id        as "brondocumentId",
            bv.id                     as "versieId",
            bv.documentsoort_gezag    as gezag,
            bv.documentsoort          as documentsoort,
            u.verificatie_status      as "verificatieStatus",
            u.waarde_numeriek::float8 as "waardeNumeriek",
            u.eenheid                 as eenheid,
            /* MAG DIT STUK ZIJN EIGEN CLAIM BEVESTIGEN.
               De regel staat in magZelfBevestigen() in
               documentsoort.ts en wordt hier NIET nagebouwd: de
               bewijskracht die daar uit komt, staat per claim al in
               bewijskracht_plafond, en de soorten die mogen
               zelfbevestigen staan in die functie. Deze kolom leest
               de twee voorwaarden die in de database staan — een
               plafond van 4 of hoger en een primaire bron — en laat
               de soortvraag aan de aanroeper. */
            (coalesce(u.bewijskracht_plafond, 0) >= 4 and b.is_primaire_bron)
                                      as "magZelfBevestigen"
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten d on d.id = bv.brondocument_id
       join intel.bronnen b on b.id = d.bron_id
      where u.organisatie_id = $1
        and u.claim_afdruk = $2
        /* EEN GERECTIFICEERDE CLAIM IS GEEN WAARNEMING MEER. De
           correctieketen is append-only, dus de oude rij blijft staan;
           hij mag alleen niet meetellen als bevestiging. */
        and not exists (
          select 1 from intel.uitspraak_correcties k
           where k.vervangen_id = u.id and k.soort = 'rectificatie')
      order by u.id`,
    [organisatieId, afdruk],
  );
}

/* ==================================================================
   HET NIVEAU WEGSCHRIJVEN
   ------------------------------------------------------------------
   PER AFDRUK EN NIET PER CLAIM. Twee claimrijen met dezelfde afdruk
   zijn dezelfde bewering en krijgen dus hetzelfde niveau; één keer
   tellen en twee keer schrijven is goedkoper dan twee keer tellen, en
   het sluit uit dat twee rijen van één bewering een ander niveau
   krijgen.
   ================================================================== */

export type BewijsniveauRonde = {
  readonly afdrukkenBekeken: number;
  readonly claimsBijgewerkt: number;
  readonly perNiveau: Readonly<Record<string, number>>;
  readonly zonderAfdruk: number;
  /** Claims die 'bevestigd' heten terwijl hun niveau dat niet draagt.
      Zij krijgen GEEN niveau — geen label is geen bewering — en gaan
      naar het claimbeoordelingsregister. */
  readonly strijdigMetStatus: number;
  /** Hoeveel daarvan een NIEUWE beoordelingsvraag opleverden. */
  readonly doorverwezen: number;
};

/**
 * Vult `bewijsniveau` in voor claims die er nog geen hebben.
 *
 * WAT HIJ NOOIT DOET:
 *   - een verificatiestatus veranderen. Het niveau is een label; de
 *     status blijft waar hij hoort, in uitspraken.ts en
 *     bronverificatie.ts. De CHECK uitspraken_bevestigd_vraagt_direct
 *     (0055) laat ook niet toe dat een niveau een bevestiging
 *     rechtvaardigt die er niet was.
 *   - een claim samenvoegen of verwijderen.
 *   - een mensbesluit overschrijven: een rij met een al gezet niveau
 *     wordt alleen opnieuw gewogen als `alles` is meegegeven.
 */
export async function vulBewijsniveauIn(
  pool: import("../kern/db.ts").Pool,
  organisatieId: number,
  opties: { max?: number; alles?: boolean } = {},
): Promise<BewijsniveauRonde> {
  const { metOrganisatie } = await import("../kern/db.ts");
  const max = opties.max ?? 500;
  const filter = opties.alles === true ? "" : "and u.bewijsniveau is null";

  const afdrukken = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ afdruk: string; claims: number }>(
      c,
      `select u.claim_afdruk as afdruk, count(*)::int as claims
         from intel.uitspraken u
        where u.organisatie_id = $1
          and u.claim_afdruk is not null
          ${filter}
        group by u.claim_afdruk
        order by u.claim_afdruk
        limit $2`,
      [organisatieId, max],
    ),
  );

  const zonderAfdruk = await metOrganisatie(pool, { organisatieId }, async (c) => {
    const r = await c.query<{ n: number }>(
      `select count(*)::int as n from intel.uitspraken
        where organisatie_id = $1 and claim_afdruk is null`,
      [organisatieId],
    );
    return r.rows[0]?.n ?? 0;
  });

  const perNiveau: Record<string, number> = {};
  let claimsBijgewerkt = 0;
  let strijdigMetStatus = 0;
  let doorverwezen = 0;

  for (const a of afdrukken) {
    const uitslag = await metOrganisatie(pool, { organisatieId }, async (c) => {
      const waarnemingen = await leesWaarnemingen(c, organisatieId, a.afdruk);
      return bepaalBewijsniveau(waarnemingen);
    });
    perNiveau[uitslag.niveau] = (perNiveau[uitslag.niveau] ?? 0) + a.claims;

    const reden =
      /* De reden moet minstens 20 tekens zijn (0055). De regel
         geeft altijd meer, maar een ondergrens hier maakt de
         constraint onmogelijk te raken. */
      uitslag.reden.length >= 20
        ? `${uitslag.reden} [${uitslag.onafhankelijkeBronnen} bron(nen): ${uitslag.bronnen.join(", ")}]`
        : `${uitslag.reden} (geen nadere grondslag vastgelegd)`;

    try {
      await metOrganisatie(pool, { organisatieId }, async (c) => {
        /* DE GRENDEL VAN 0055 STAAT IN DE WHERE, NIET IN DE HOOP.
           ------------------------------------------------------------
           uitspraken_bevestigd_vraagt_direct laat op een rij die al
           'bevestigd' is alleen DIRECT_BEVESTIGD toe. Deze UPDATE raakte
           elke rij met dezelfde afdruk, dus één al bevestigde rij met een
           ander niveau liet de hele UPDATE vallen — en daarmee de ronde,
           de taak en na vijf pogingen de hele semantiekstap.

           GEMETEN OP PRODUCTIE, 6 november 2026: taak 6887
           (semantiek:2026-11-06T08) stond in de DLQ met precies deze
           schending, 85 van 170 claims staan op 'bevestigd' en 150 hadden
           daardoor nog geen niveau. De nieuwe claims van die dag — de
           ACM-publicatie achter nieuwskandidaat 245 — kregen daardoor
           nooit een verwoordbaarheidsoordeel.

           De voorwaarde hieronder is dezelfde regel als de CHECK, nu als
           filter: een bevestigde rij krijgt alleen een niveau als dat
           niveau de bevestiging ook draagt. Er gaat GEEN drempel omlaag:
           niets wordt opgewaardeerd, geen verificatiestatus verandert, en
           de rijen die afvallen krijgen geen label in plaats van een te
           zwak label. */
        const r = await c.query(
          `update intel.uitspraken
              set bewijsniveau       = $3,
                  bewijsniveau_reden = $4,
                  bewijsniveau_op    = now()
            where organisatie_id = $1
              and claim_afdruk   = $2
              and (verificatie_status <> 'bevestigd' or $3 = 'DIRECT_BEVESTIGD')`,
          [organisatieId, a.afdruk, uitslag.niveau, reden],
        );
        claimsBijgewerkt += r.rowCount ?? 0;

        /* WAT ER AFVIEL, WORDT GETELD EN DOORVERWEZEN.
           Een claim die 'bevestigd' heet terwijl het bewijsniveau dat
           niet draagt, is geen administratief detail: het is precies de
           vraag die een mens hoort te beantwoorden. Het bestaande
           claimbeoordelingsregister is daarvoor gemaakt — het kan per
           constructie niets opwaarderen (zie claimbeoordeling.ts,
           eigenschap 2) en vraagt dankzij de unieke index per claim en
           motorversie precies EEN keer. */
        if (uitslag.niveau !== "DIRECT_BEVESTIGD") {
          /* De versie komt uit uitspraak_bronnen en niet uit de claimrij:
             claimbeoordeling.versie_id is NOT NULL met een verwijzing naar
             brondocument_versies (0047). De primaire waarneming heeft
             voorrang; zonder waarneming is er niets om naar te verwijzen
             en slaan we de doorverwijzing over. */
          const strijdig = await c.query<{ id: number; versie_id: number | null }>(
            `select u.id,
                    (select ub.versie_id
                       from intel.uitspraak_bronnen ub
                      where ub.uitspraak_id = u.id
                      order by (ub.rol = 'primair') desc, ub.versie_id
                      limit 1) as versie_id
               from intel.uitspraken u
              where u.organisatie_id = $1
                and u.claim_afdruk   = $2
                and u.verificatie_status = 'bevestigd'
                and u.bewijsniveau is null`,
            [organisatieId, a.afdruk],
          );
          strijdigMetStatus += strijdig.rows.length;
          for (const rij of strijdig.rows) {
            if (rij.versie_id === null) continue;
            const nieuw = await vraagOmBeoordeling(c, organisatieId, {
              uitspraakId: rij.id,
              versieId: rij.versie_id,
              aanleiding: "BEWIJSNIVEAU_STRIJDIG_MET_STATUS",
              reden:
                `De claim staat op 'bevestigd', maar het bewijsniveau komt uit op ` +
                `${uitslag.niveau}. ${reden}`,
              motorversies: BEWIJSNIVEAU_VERSIE,
            });
            if (nieuw) doorverwezen += 1;
          }
        }
      });
    } catch (e) {
      /* FAIL-OPEN OP DE AFDRUK, FAIL-CLOSED OP HET OORDEEL — dezelfde
         keuze als in vulClaimAfdrukkenIn() hieronder. Een afdruk die niet
         bijgewerkt kan worden houdt zijn claims op bewijsniveau NULL, en
         dat is de veilige kant: geen label is geen bewering. Eén
         onbekende rand mag de ronde niet meer laten vallen. */
      log.waarschuwing("bewijsniveau niet vastgelegd voor afdruk", {
        afdruk: a.afdruk.slice(0, 16),
        niveau: uitslag.niveau,
        fout: e instanceof Error ? e.message.slice(0, 200) : "onbekend",
      });
    }
  }

  if (strijdigMetStatus > 0) {
    log.waarschuwing("claims met een bewijsniveau dat hun status niet draagt", {
      strijdigMetStatus,
      doorverwezen,
      toelichting:
        "bevestigd zonder DIRECT_BEVESTIGD: geen niveau vastgelegd, wel doorverwezen naar beoordeling",
    });
  }

  return {
    afdrukkenBekeken: afdrukken.length,
    claimsBijgewerkt,
    perNiveau,
    zonderAfdruk,
    strijdigMetStatus,
    doorverwezen,
  };
}

/* ==================================================================
   DE AFDRUKKEN BIJVULLEN
   ------------------------------------------------------------------
   STAAT IN DIT BESTAND EN NIET IN claimidentiteit.ts, want die module
   is puur: geen database, geen netwerk, geen model. En hij staat niet
   in semantiekopslag.ts omdat hij in DEZELFDE taak moet draaien als
   vulBewijsniveauIn() — een claim zonder afdruk is onzichtbaar voor de
   niveautelling, dus twee taken zouden een venster openen waarin de
   uitslag van de planningsorde afhangt.

   NIETS WORDT VERZONNEN. Alle velden die in de afdruk gaan, staan al
   in de rij: soort, waarde, eenheid, claimvorm, datumrol, de
   geldigheidsdatums, modaliteit, tijdstand, onderwerp en de bronzin.
   Daarom is dit een MEting en geen schatting.
   ================================================================== */

export type AfdrukRonde = {
  readonly bekeken: number;
  readonly gevuld: number;
  readonly overgeslagen: number;
};

/**
 * Berekent `claim_afdruk` voor claims die er nog geen hebben.
 *
 * RAAKT ALLEEN claim_afdruk EN claim_afdruk_versie AAN. Geen waarde,
 * geen status, geen oordeel. En hij overschrijft een bestaande afdruk
 * niet, tenzij `alles` is meegegeven — nodig na een versiewissel van
 * de afdrukregel, en dan is het een expliciete handeling.
 */
export async function vulClaimAfdrukkenIn(
  pool: import("../kern/db.ts").Pool,
  organisatieId: number,
  opties: { max?: number; alles?: boolean } = {},
): Promise<AfdrukRonde> {
  const { metOrganisatie } = await import("../kern/db.ts");
  const { claimAfdruk, CLAIMIDENTITEIT_VERSIE } = await import("./claimidentiteit.ts");
  const max = opties.max ?? 2000;
  const filter =
    opties.alles === true
      ? ""
      : `and (u.claim_afdruk is null
             or u.claim_afdruk_versie is distinct from '${CLAIMIDENTITEIT_VERSIE}')`;

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      id: number;
      soort: string;
      waarde_numeriek: string | null;
      eenheid: string | null;
      claimvorm: string | null;
      datumrol: string | null;
      geldig_vanaf: string | null;
      geldig_tot: string | null;
      modaliteit: string | null;
      tijdstand: string | null;
      onderwerp: string | null;
      tekst: string;
    }>(
      c,
      `select u.id, u.soort, u.waarde_numeriek::text as waarde_numeriek, u.eenheid,
              u.claimvorm, u.datumrol, u.geldig_vanaf::text as geldig_vanaf,
              u.geldig_tot::text as geldig_tot, u.modaliteit, u.tijdstand,
              u.onderwerp, u.tekst
         from intel.uitspraken u
        where u.organisatie_id = $1
          ${filter}
        order by u.id
        limit $2`,
      [organisatieId, max],
    ),
  );

  let gevuld = 0;
  let overgeslagen = 0;
  for (const r of kandidaten) {
    const afdruk = claimAfdruk({
      soort: r.soort,
      waardeNumeriek: r.waarde_numeriek === null ? null : Number(r.waarde_numeriek),
      eenheid: r.eenheid,
      claimvorm: r.claimvorm,
      datumrol: r.datumrol,
      geldigVanaf: r.geldig_vanaf,
      geldigTot: r.geldig_tot,
      modaliteit: r.modaliteit,
      tijdstand: r.tijdstand,
      onderwerp: r.onderwerp,
      tekst: r.tekst,
    });
    try {
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(
          `update intel.uitspraken
              set claim_afdruk = $3, claim_afdruk_versie = $4
            where organisatie_id = $1 and id = $2`,
          [organisatieId, r.id, afdruk, CLAIMIDENTITEIT_VERSIE],
        ),
      );
      gevuld += 1;
    } catch {
      /* FAIL-OPEN OP DE RIJ, FAIL-CLOSED OP HET OORDEEL. Een rij die
         niet bijgewerkt kan worden houdt `claim_afdruk` NULL, en dan
         slaat vulBewijsniveauIn() hem over en meldt hem als
         `zonderAfdruk`. Geen stille aanname, en geen afgebroken ronde. */
      overgeslagen += 1;
    }
  }

  return { bekeken: kandidaten.length, gevuld, overgeslagen };
}
