/* ============================================================
   PIJPLIJN — is het oorspronkelijke besluit ook bij het gezag gezien?
   ------------------------------------------------------------
   WAT DIT OPLOST, en waarom het een eigen laag is.

   `documentsoort.ts` stelt vast DAT een document een besluit van een
   ander gezag navertelt, en zet dat gezag in `beschrijftBesluitVan`.
   Die navertelling draagt geen eigen bewijs: bewijskracht 2, niet
   bevestigd. Dat is veilig, maar niet het eindstation. De opdracht:

     "Als een document een officieel besluit beschrijft, moet de motor
      waar mogelijk het oorspronkelijke besluit bij ACM of de betreffende
      bevoegde instantie verifiëren. Zonder die verificatie blijft de
      bewijskracht beperkt."

   ------------------------------------------------------------
   WAAROM DEZE MODULE IS HERSCHREVEN — een audit met 44 bevindingen.

   De eerste versie koppelde op `waarde_numeriek` en `eenheid` onder de
   bronnen van het gezag, met `order by u.id limit 1`. Een adversariële
   audit over acht scenario's (verschillende besluiten, verschillende
   jaren, voorstel versus besluit, regionaal versus landelijk, vervallen
   besluiten, tegenstrijdige publicaties, onvolledige bronvermelding)
   wees aan dat die koppeling een IDENTITEIT beweerde die hij niet kon
   onderbouwen. De zwaarste bevindingen, elk met een concreet gevolg:

     1 GEEN GROOTHEID. '20 %' uit een subsidie-intensiteit en '20 %' uit
       een tariefstijging zijn voor zo'n query hetzelfde feit. Een
       eenheid draagt de dimensie, niet de grootheid.
     2 GEEN TIJD. Hetzelfde bedrag komt bij een gezag over jaren heen
       terug. Een besluit uit 2024 kon het 'origineel' heten van een
       navertelling uit 2026.
     3 DE TREFFER HOEFDE GEEN BESLUIT TE ZIJN. Er stond geen eis op
       `bv.documentsoort`, dus een persbericht, een opiniestuk of
       opnieuw een navertelling bij hetzelfde gezag gold als origineel.
     4 DE TREFFER HOEFDE NIET TE GELDEN. Geen eis op `u.modaliteit`, dus
       een ONTWERPbesluit of een consultatiestuk bij het gezag
       bevestigde een nagevertelde VASTSTELLING.
     5 DE TREFFER MOCHT INGETROKKEN ZIJN. Geen eis op
       `u.verificatie_status`, dus een claim die het platform zelf al
       als 'tegengesproken', 'verlopen' of 'ingetrokken' had geboekt —
       precies de stand van een vervangen besluit — gold nog steeds.
     6 DE JOIN MISTE `rol = 'primair'`. Een claim die aan een
       gezagsdocument hing als TEGENSPREKEND — de administratie dat dat
       document de claim WEERSPREEKT — gold als het origineel.
     7 DE OUDSTE WON. `order by u.id limit 1` kiest bij meerdere
       treffers systematisch de laagste id, dus de eerst opgehaalde rij,
       dus juist de vervallen variant.
     8 DE UITSLAG WAS NIET NA TE REKENEN. Alleen een boolean werd
       weggeschreven; welke claim bij welk document het origineel was,
       verdween. En de vlag was GELATCHT: de werkvoorraad sloot
       `primaire_bron_bevestigd` uit, dus een onjuiste 'true' werd nooit
       meer herzien.

   ------------------------------------------------------------
   WAT DE KOPPELING NU EIST

   Elk van de acht is gerepareerd, met ÉÉN belangrijke beperking die
   hieronder apart staat. De voorwaarden:

     · dezelfde `onderwerp` — de grootheidsanker;
     · dezelfde `eenheid` en `waarde_numeriek`;
     · dezelfde `soort` claim (een prijs is geen percentage);
     · verenigbaar `toepassingsgebied` (gelijk, of één van beide
       onbekend) — een Belgisch getal verifieert geen Nederlands getal;
     · de treffer staat in een document dat ZELF vaststelt:
       `documentsoort in (OFFICIEEL_BESLUIT, OFFICIELE_REGELGEVING)` en
       `beschrijft_besluit_van is null`;
     · de treffer is `modaliteit = 'VASTGESTELD'` met voldoende
       zekerheid — een voorstel verifieert geen vaststelling;
     · de treffer is `verificatie_status = 'bevestigd'`;
     · beide kanten hangen met `rol = 'primair'` aan hun document;
     · het origineel is NIET LATER gepubliceerd dan de navertelling, en
       niet meer dan TIJDVENSTER_DAGEN eerder;
     · komt het uit een bron die bekendmakingen van MEERDERE instanties
       bundelt (de Staatscourant, het Gemeenteblad), dan moet het
       document het gezag ook ZELF noemen — een bundel is een kanaal en
       geen bestuursorgaan; nieuw in v3, zie GEBUNDELDE_BEKENDMAKINGEN;
     · en er is PRECIES ÉÉN treffer.

   DIE LAATSTE IS DE BELANGRIJKSTE. Bij meerdere kandidaten is de
   uitslag AMBIGU en níet TERUGGEVONDEN. Daarmee verdwijnt de
   willekeurige tie-break: er wordt geen origineel gekozen, er wordt
   gezegd dat het niet vast te stellen is.

   ------------------------------------------------------------
   DE BEPERKING DIE BLIJFT, EERLIJK BENOEMD

   De audit stelde terecht voor om ook `geldig_vanaf`, `geldig_tot`,
   `fenomeen` en `subject` mee te koppelen. Gemeten over de 59
   productieclaims op 30 oktober 2026 zijn die kolommen grotendeels
   leeg:

     onderwerp          59 van 59
     toepassingsgebied  36 van 59
     subject            17 van 59
     horizon            14 van 59
     fenomeen           12 van 59
     geldig_tot          8 van 59
     geldig_vanaf        7 van 59

   `zoekGetallen()` in uitspraken.ts zet `geldigVanaf` en `geldigTot`
   voor élke numerieke claim op null. Een harde eis op die velden zou de
   koppeling dus nooit laten slagen — niet omdat er geen origineel is,
   maar omdat het veld leeg is. Dat is geen veiligheid maar een
   verborgen weigering.

   Daarom: `onderwerp` is een HARDE eis (altijd gevuld), het
   publicatiedatumvenster neemt de rol van de tijdgrens over (de
   documentdatum is altijd gevuld), en `toepassingsgebied` is een
   VERENIGBAARHEIDStoets in plaats van een gelijkheidseis. Wordt de
   semantieklaag ooit vollediger, dan kunnen `fenomeen` en `subject`
   erbij; tot die tijd staat hier wat er werkelijk te toetsen is.

   ------------------------------------------------------------
   GEEN NETWERKAANROEP, en dat is een keuze met een reden

     1 de collector heeft al een robots- en TDM-discipline per bron, en
       een losse fetch uit de verificatielaag omzeilt die;
     2 een netwerkaanroep in een wachtrijtaak maakt de uitslag
       afhankelijk van een derde partij. Gemeten op 29 oktober 2026:
       tenderned gaf 503 op zijn robots.txt en de ophaling werd terecht
       geweigerd. Een verificatie die dan 'onbevestigd' zegt, zegt iets
       over de dag en niet over het feit;
     3 de uitslag moet reproduceerbaar zijn.

   NIET_TERUGGEVONDEN betekent daarom: niet aangetroffen in de
   beschikbare verzameling. Het is géén bewering dat het besluit niet
   bestaat. Dat onderscheid staat in de uitslag en in de grondslag, niet
   in een voetnoot.
   ============================================================ */

import type pg from "pg";
import { maakLogger } from "../kern/log.ts";
import { BRONNEN } from "../bronnen/register.ts";
import { NOODZAKELIJKE_ZEKERHEID } from "./claimmodaliteit.ts";
import {
  documentNoemtGezag,
  EIGEN_GEZAG_NAMEN,
  GEBUNDELDE_BEKENDMAKINGEN,
  gezagVan,
} from "./documentsoort.ts";

const log = maakLogger("bronverificatie");

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const BRONVERIFICATIE_VERSIE = "bronverificatie-v3";

/**
 * Hoeveel dagen mag het origineel VOOR de navertelling liggen.
 *
 * 400 en niet 30: een navertelling kan maanden later komen (een
 * jaaroverzicht dat een besluit van vorig voorjaar aanhaalt), en de
 * grens moet een JAARWISSELING uitsluiten zonder een normale
 * publicatievertraging te raken. 400 dagen laat ruim een jaar toe maar
 * sluit 'hetzelfde bedrag, twee jaar eerder' uit — het scenario waar de
 * audit op wees.
 *
 * De andere richting is NUL: een besluit dat NA zijn navertelling is
 * gepubliceerd kan het origineel niet zijn.
 */
export const TIJDVENSTER_DAGEN = 400;

/**
 * Welke bronsleutels vormen het gezag met deze naam.
 *
 * AFGELEID UIT EIGEN_GEZAG_NAMEN en niet met de hand bijgehouden. De
 * eerste versie was een losse kaart die zichzelf 'de omgekeerde kaart
 * van EIGEN_GEZAG_NAMEN' noemde en dat niet was: de audit vond dat
 * `koop-gemeenteblad-vergunningen` in EIGEN_GEZAG_NAMEN onder 'de
 * minister' staat maar in die kaart ontbrak — precies de bron met de
 * regionale bekendmakingen. Twee kaarten van dezelfde relatie lopen
 * uiteen; één afleiding kan dat niet.
 */
function bouwBronnenVanGezag(): ReadonlyMap<string, readonly string[]> {
  const kaart = new Map<string, string[]>();
  for (const [sleutel, namen] of Object.entries(EIGEN_GEZAG_NAMEN)) {
    const bron = BRONNEN.find((b) => b.sleutel === sleutel);
    /* Alleen een bron die in het register staat EN bevoegd gezag is.
       Zonder die tweede eis zou een verkeerd ingevulde kaart een
       willekeurige bron tot gezag maken. */
    if (bron === undefined || gezagVan(bron.uitgeverSoort) !== "BEVOEGD_GEZAG") continue;
    for (const naam of namen) {
      const lijst = kaart.get(naam) ?? [];
      lijst.push(sleutel);
      kaart.set(naam, lijst);
    }
  }
  return kaart;
}

const BRONNEN_VAN_GEZAG = bouwBronnenVanGezag();

/** Bestaat er een bron in het register die dit gezag vormt, en welke. */
export function bronnenVanGezag(gezagNaam: string): readonly string[] {
  return BRONNEN_VAN_GEZAG.get(gezagNaam) ?? [];
}

export type Verificatie =
  | {
      readonly uitslag: "TERUGGEVONDEN";
      readonly bijUitspraakId: number;
      readonly bijBron: string;
      readonly bijDocument: string;
      readonly toelichting: string;
      readonly grondslag: Record<string, unknown>;
    }
  | {
      readonly uitslag: "AMBIGU";
      /** Hoeveel kandidaten even goed pasten. */
      readonly kandidaten: number;
      readonly toelichting: string;
      readonly grondslag: Record<string, unknown>;
    }
  | {
      readonly uitslag: "NIET_TERUGGEVONDEN";
      readonly toelichting: string;
      readonly grondslag: Record<string, unknown>;
    }
  | {
      readonly uitslag: "NIET_VAN_TOEPASSING";
      readonly toelichting: string;
      readonly grondslag: Record<string, unknown>;
    };

export type TeVerifierenClaim = {
  readonly uitspraakId: number;
  readonly beschrijftBesluitVan: string | null;
  readonly waarde: number | null;
  readonly eenheid: string | null;
  readonly soort: string;
  readonly onderwerp: string | null;
  readonly toepassingsgebied: string | null;
  /** Publicatiedatum van het document waarin de navertelling staat. */
  readonly brondatum: string | null;
};

/**
 * Zoekt het origineel van één claim bij het gezag dat het besluit nam.
 *
 * De voorwaarden staan in de kop. Belangrijk om hier te herhalen: bij
 * meerdere treffers is de uitslag AMBIGU en wordt er GEEN origineel
 * gekozen.
 */
export async function verifieerBijGezag(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  claim: TeVerifierenClaim,
): Promise<Verificatie> {
  const basis: Record<string, unknown> = {
    versie: BRONVERIFICATIE_VERSIE,
    gezag: claim.beschrijftBesluitVan,
    waarde: claim.waarde,
    eenheid: claim.eenheid,
    onderwerp: claim.onderwerp,
    soort: claim.soort,
    toepassingsgebied: claim.toepassingsgebied,
    brondatum: claim.brondatum,
  };

  if (claim.beschrijftBesluitVan === null) {
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting: "dit document vertelt geen besluit van een ander gezag na",
      grondslag: basis,
    };
  }
  if (claim.waarde === null || claim.eenheid === null) {
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting:
        "de claim draagt geen getal met eenheid; een woordovereenkomst is geen verificatie",
      grondslag: basis,
    };
  }
  if (claim.onderwerp === null) {
    /* GEEN ONDERWERP, GEEN KOPPELING. Het onderwerp is het enige
       grootheidsanker dat in deze dataset altijd gevuld is (59 van 59).
       Zonder dat anker zou de koppeling terugvallen op getal plus
       eenheid, en dat is precies wat de audit heeft afgekeurd. */
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting:
        "de claim heeft geen onderwerp, en zonder grootheidsanker is een gelijk getal geen " +
        "gelijk besluit",
      grondslag: basis,
    };
  }
  if (claim.brondatum === null) {
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting:
        "het document van de navertelling heeft geen datum, dus er is geen tijdvenster te " +
        "bepalen waarin het origineel moet liggen",
      grondslag: basis,
    };
  }

  const bronnen = bronnenVanGezag(claim.beschrijftBesluitVan);
  if (bronnen.length === 0) {
    return {
      uitslag: "NIET_TERUGGEVONDEN",
      toelichting:
        `er is geen bron in het register die '${claim.beschrijftBesluitVan}' vormt, dus het ` +
        "origineel kan hier niet gezien zijn — dat is iets anders dan dat het niet bestaat",
      grondslag: { ...basis, bronnenVanGezag: [] },
    };
  }

  const { rows: ruwe } = await c.query<{
    id: number;
    bron: string;
    titel: string;
    ruwe_tekst: string;
    doc_datum: string | null;
    documentsoort: string;
  }>(
    `select u.id, b.sleutel as bron, bd.titel, bv.ruwe_tekst,
            coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as doc_datum,
            bv.documentsoort
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten bd on bd.id = bv.brondocument_id
       join intel.bronnen b on b.id = bd.bron_id
      where u.organisatie_id = $1
        and b.sleutel = any($2)
        and u.id <> $3
        -- de grootheid: getal, eenheid, soort EN onderwerp
        and u.waarde_numeriek = $4
        and u.eenheid = $5
        and u.soort = $6
        and u.onderwerp = $7
        -- verenigbaar rechtsgebied: gelijk, of een van beide onbekend
        and (
          u.toepassingsgebied is null
          or $8::text is null
          or u.toepassingsgebied = 'ONBEKEND'
          or $8 = 'ONBEKEND'
          or u.toepassingsgebied = $8
        )
        -- het origineel moet zelf vaststellen, en geen navertelling zijn
        and bv.documentsoort in ('OFFICIEEL_BESLUIT', 'OFFICIELE_REGELGEVING')
        and bv.beschrijft_besluit_van is null
        -- het origineel moet GELDEN, niet voorgesteld of verwacht zijn
        and u.modaliteit = 'VASTGESTELD'
        and coalesce(u.modaliteit_zekerheid, 0) >= $9
        -- en het moet bij het gezag zelf als bewijs staan
        and u.verificatie_status = 'bevestigd'
        -- tijdvenster: het origineel komt eerst, en niet te lang eerst
        and coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date <= $10::date
        and coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date
              >= ($10::date - make_interval(days => $11))
      order by u.id`,
    [
      organisatieId,
      bronnen,
      claim.uitspraakId,
      claim.waarde,
      claim.eenheid,
      claim.soort,
      claim.onderwerp,
      claim.toepassingsgebied,
      NOODZAKELIJKE_ZEKERHEID,
      claim.brondatum,
      TIJDVENSTER_DAGEN,
    ],
  );

  /* EEN BEKENDMAKINGENKANAAL IS GEEN INSTANTIE.
     De omgekeerde gezagkaart wijst bronSLEUTELS aan, en twee van die
     sleutels zijn bundels: de Staatscourant en het Gemeenteblad
     publiceren besluiten van veel bestuursorganen door elkaar. Zonder
     deze filter kon een GEMEENTELIJKE vergunning in het Gemeenteblad
     een ministerieel besluit "bevestigen" zodra het getal, de eenheid,
     het onderwerp en het tijdvenster toevallig klopten — en dan zegt de
     uitslag TERUGGEVONDEN over een document van een heel ander orgaan.

     Voor zo'n bron moet het document het gezag daarom ook zelf NOEMEN.
     Dat is een extra eis en geen versoepeling: er kunnen alleen minder
     treffers overblijven. En het verschil is zichtbaar in de grondslag,
     zodat een afgewezen kandidaat niet stil verdwijnt.

     Een bron die het gezag zelf IS (acm-besluiten, rvo-*,
     tennet-publicaties, rijksoverheid-nieuws) gaat hier ongemoeid
     langs: daar is de uitgever het bestuursorgaan. */
  const afgewezenOmGezag: { uitspraakId: number; bron: string; document: string }[] = [];
  const rows = ruwe.filter((r) => {
    if (!GEBUNDELDE_BEKENDMAKINGEN.has(r.bron)) return true;
    if (documentNoemtGezag(claim.beschrijftBesluitVan!, `${r.titel} ${r.ruwe_tekst}`)) return true;
    afgewezenOmGezag.push({ uitspraakId: r.id, bron: r.bron, document: r.titel });
    return false;
  });

  const grondslag: Record<string, unknown> = {
    ...basis,
    bronnenVanGezag: bronnen,
    tijdvensterDagen: TIJDVENSTER_DAGEN,
    gebundeldeBronnen: bronnen.filter((b) => GEBUNDELDE_BEKENDMAKINGEN.has(b)),
    /* Wat wél paste op grootheid en tijd, maar het gezag niet noemde.
       Hoort in de grondslag: anders is een NIET_TERUGGEVONDEN niet te
       onderscheiden van 'er was niets'. */
    afgewezenOmGezag,
    kandidaten: rows.map((r) => ({
      uitspraakId: r.id,
      bron: r.bron,
      document: r.titel,
      datum: r.doc_datum,
      documentsoort: r.documentsoort,
    })),
  };

  if (rows.length === 0) {
    return {
      uitslag: "NIET_TERUGGEVONDEN",
      toelichting:
        `geen vastgesteld besluit met ${claim.waarde} ${claim.eenheid} over '${claim.onderwerp}' ` +
        `gevonden onder ${bronnen.join(", ")} in de ${TIJDVENSTER_DAGEN} dagen voor ` +
        `${claim.brondatum}; het origineel is niet in onze verzameling`,
      grondslag,
    };
  }

  if (rows.length > 1) {
    /* MEERDERE KANDIDATEN IS GEEN KEUZE MAAR EEN UITSLAG.
       De oude versie nam hier `order by u.id limit 1` en dus de oudste
       rij — bij een vervangen besluit systematisch de vervallen. Er valt
       hier niets te kiezen: als twee vastgestelde besluiten van hetzelfde
       gezag hetzelfde getal over hetzelfde onderwerp noemen binnen het
       venster, dan is niet vast te stellen welk van de twee deze
       navertelling beschrijft. */
    return {
      uitslag: "AMBIGU",
      kandidaten: rows.length,
      toelichting:
        `${rows.length} vastgestelde besluiten van ${claim.beschrijftBesluitVan} noemen ` +
        `${claim.waarde} ${claim.eenheid} over '${claim.onderwerp}' binnen het tijdvenster. ` +
        "Welke van die besluiten deze navertelling beschrijft is niet vast te stellen, dus er " +
        "wordt geen origineel aangewezen.",
      grondslag,
    };
  }

  const treffer = rows[0]!;
  return {
    uitslag: "TERUGGEVONDEN",
    bijUitspraakId: treffer.id,
    bijBron: treffer.bron,
    bijDocument: treffer.titel,
    toelichting:
      `${claim.waarde} ${claim.eenheid} over '${claim.onderwerp}' staat als vastgesteld besluit ` +
      `in '${treffer.titel}' (${treffer.documentsoort}, ${treffer.doc_datum}) van ` +
      `${treffer.bron} — het gezag dat dit besluit nam`,
    grondslag,
  };
}

export type VerificatieRonde = {
  readonly bekeken: number;
  readonly teruggevonden: number;
  readonly ambigu: number;
  readonly nietTeruggevonden: number;
  readonly nietVanToepassing: number;
};

/**
 * Loopt de claims langs die een besluit van een ander gezag navertellen
 * en legt per claim de uitslag vast.
 *
 * ZET GEEN `verificatie_status`. Dat is bewust: of een claim bevestigd
 * mag worden is de beslissing van schrijfUitspraken() en van de
 * herbeoordeling, en die stil van buitenaf overschrijven zou de herkomst
 * van de status onnavolgbaar maken. Deze laag levert een FEIT — het
 * origineel is gezien, of niet, of niet vast te stellen — met zijn
 * grondslag erbij.
 *
 * NIET GELATCHT. De werkvoorraad is 'nog niet door DEZE motorversie
 * gewogen' en niet 'de vlag staat nog op false'. Een nieuwe
 * BRONVERIFICATIE_VERSIE laat dus alles opnieuw wegen, inclusief de
 * claims die eerder TERUGGEVONDEN waren — precies wat nodig is als de
 * koppeling strenger wordt, zoals nu.
 */
export async function verifieerNavertellingen(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  opties: { readonly max?: number; readonly droog?: boolean } = {},
): Promise<VerificatieRonde> {
  const max = opties.max ?? 500;
  const droog = opties.droog === true;

  const { rows } = await c.query<{
    id: number;
    waarde: string | null;
    eenheid: string | null;
    soort: string;
    onderwerp: string | null;
    toepassingsgebied: string | null;
    besluit_van: string | null;
    brondatum: string | null;
  }>(
    `select u.id, u.waarde_numeriek::text as waarde, u.eenheid, u.soort,
            u.onderwerp, u.toepassingsgebied,
            bv.beschrijft_besluit_van as besluit_van,
            coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as brondatum
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten bd on bd.id = bv.brondocument_id
      where u.organisatie_id = $1
        and bv.documentsoort = 'SECUNDAIRE_BERICHTGEVING'
        and bv.beschrijft_besluit_van is not null
        and u.primaire_bron_versie is distinct from $2
      order by u.id
      limit $3`,
    [organisatieId, BRONVERIFICATIE_VERSIE, max],
  );

  let teruggevonden = 0;
  let ambigu = 0;
  let nietTeruggevonden = 0;
  let nietVanToepassing = 0;

  for (const r of rows) {
    const v = await verifieerBijGezag(c, organisatieId, {
      uitspraakId: r.id,
      beschrijftBesluitVan: r.besluit_van,
      waarde: r.waarde === null ? null : Number(r.waarde),
      eenheid: r.eenheid,
      soort: r.soort,
      onderwerp: r.onderwerp,
      toepassingsgebied: r.toepassingsgebied,
      brondatum: r.brondatum,
    });

    if (v.uitslag === "TERUGGEVONDEN") teruggevonden += 1;
    else if (v.uitslag === "AMBIGU") ambigu += 1;
    else if (v.uitslag === "NIET_TERUGGEVONDEN") nietTeruggevonden += 1;
    else nietVanToepassing += 1;

    if (droog) continue;

    await c.query(
      `update intel.uitspraken
          set primaire_bron_bevestigd   = $2,
              primaire_bron_uitspraak_id = $3,
              primaire_bron_grondslag   = $4,
              primaire_bron_versie      = $5,
              bijgewerkt_op             = now()
        where id = $1 and organisatie_id = $6`,
      [
        r.id,
        v.uitslag === "TERUGGEVONDEN",
        v.uitslag === "TERUGGEVONDEN" ? v.bijUitspraakId : null,
        JSON.stringify({ uitslag: v.uitslag, toelichting: v.toelichting, ...v.grondslag }),
        BRONVERIFICATIE_VERSIE,
        organisatieId,
      ],
    );
  }

  log.info("bronverificatie gereed", {
    versie: BRONVERIFICATIE_VERSIE,
    bekeken: rows.length,
    teruggevonden,
    ambigu,
    niet_teruggevonden: nietTeruggevonden,
    niet_van_toepassing: nietVanToepassing,
    droog,
  });

  return {
    bekeken: rows.length,
    teruggevonden,
    ambigu,
    nietTeruggevonden,
    nietVanToepassing,
  };
}
