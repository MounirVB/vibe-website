/* ============================================================
   PIJPLIJN — historische claims herbeoordelen onder de R3-regels
   ------------------------------------------------------------
   HET PROBLEEM, gemeten in productie op 30 oktober 2026.

   0042 gaf elke claim een modaliteit en elk document een soort, maar
   raakte de BESTAANDE rijen niet aan. In productie staan daardoor:

     claims in intel.uitspraken                59
     oorspronkelijk bevestigd                  51
     bevestiging BEHOUDEN onder R3              5   (alle van RVO)
     bevestiging INGETROKKEN onder R3          46
     bewijskracht verlaagd                     59
     getroffen gebeurtenissen                  18

   Die 46 staan nog op 'bevestigd' met bewijs_kwaliteit 5, waaronder een
   verzoek aan de Tweede Kamer (de Flex-E-claim uit een lobbydocument).
   Zolang ze zo staan, kan een laag die alleen naar `verificatie_status`
   kijkt ze als bewijs behandelen.

   ------------------------------------------------------------
   TWEE MECHANISMEN, EN WAAROM BEIDE NODIG ZIJN

   Deze module is het ÉNE: hij herrekent het oordeel en schrijft het weg.
   Het andere is de GELDIGHEIDSCONTROLE in de lagen die claims
   verbruiken: een claim zonder actueel R3-oordeel telt daar niet mee,
   ook niet als zijn `verificatie_status` 'bevestigd' zegt.

   Ze zijn niet uitwisselbaar. De herverwerking kan half klaar zijn — hij
   draait in porties en kan afbreken — en precies in dat venster moet het
   systeem dicht vallen in plaats van op de oude waarde terug te vallen.
   De geldigheidscontrole is dus de grendel, de herverwerking de opruiming.

   ------------------------------------------------------------
   DE RICHTING IS ÉÉNZIJDIG, EN DAT IS NA TE REKENEN

   De oude regel was `isPrimaireBron && betrouwbaarheid >= 4`. De nieuwe
   is diezelfde voorwaarde PLUS `magZelfBevestigen(soort, gezag)`. De
   nieuwe verzameling is dus een deelverzameling van de oude: deze
   herverwerking kan een bevestiging alleen INTREKKEN en nooit toekennen.

   Dat is geen detail maar de reden dat dit veilig is. Een herverwerking
   die ook kan promoveren zou een claim als bewijs kunnen aanmerken die
   dat nooit eerder was, en dan is een halve ronde erger dan geen ronde.
   `herbeoordeelClaim()` dwingt die richting expliciet af; zie de
   toelichting daar.

   ------------------------------------------------------------
   WAT ER NIET GEBEURT

   Geen tweede claimtabel. Geen kopie van de brontekst. Geen verwijdering
   van rijen. Geen aanraking van `intel.uitspraak_bronnen`,
   `intel.inhoud_uitspraken` of `intel.gebeurtenis_documenten` — de
   koppelingen blijven precies zoals ze zijn.

   Geen aanraking van een MENSELIJK oordeel: een claim met
   `oordeel_bron = 'mens'` wordt overgeslagen en in het rapport geteld.

   En geen stil spoor: elke wijziging schrijft één rij in
   `intel.audit_gebeurtenissen`, die sinds migratie 0001 append-only is
   (trigger `audit_geen_wijziging`). Daarmee is elke intrekking terug te
   vinden met zijn voor- en nawaarde, en is de ronde omkeerbaar zonder
   dat deze module een eigen terugdraaipad nodig heeft.
   ============================================================ */

import type pg from "pg";
import { maakLogger } from "../kern/log.ts";
import { bepaalModaliteit, MODALITEIT_VERSIE } from "./claimmodaliteit.ts";
import {
  bewijskrachtPlafond,
  DOCUMENTSOORT_VERSIE,
  magZelfBevestigen,
  type Documentsoort,
  type Gezag,
} from "./documentsoort.ts";
import { classificeerVersie, slaDocumentsoortOp } from "./documentclassificatie.ts";

const log = maakLogger("herbeoordeling");

/** De handeling waaronder een intrekking in het auditlogboek staat. */
export const HERBEOORDELING_HANDELING = "claim_herbeoordeeld_r3";

export type HerbeoordeelRapport = {
  readonly bekeken: number;
  readonly herbeoordeeld: number;
  readonly bevestigingBehouden: number;
  readonly bevestigingIngetrokken: number;
  readonly bewijskrachtVerlaagd: number;
  readonly menselijkOvergeslagen: number;
  readonly zonderBrongegevens: number;
  /** Claims die na de ronde bevestigd zijn maar niet als feit dragen. */
  readonly vraagtMenselijkeControle: number;
  readonly perDocumentsoort: Readonly<Record<string, number>>;
  readonly getroffenGebeurtenissen: readonly number[];
  readonly droog: boolean;
};

type ClaimRij = {
  id: number;
  gebeurtenis_id: number | null;
  versie_id: number;
  titel: string;
  ruwe_tekst: string;
  canonieke_url: string | null;
  bron_sleutel: string;
  injectie_verdacht: boolean;
  betrouwbaarheid: number;
  is_primaire_bron: boolean;
  brondatum: string | null;
  tekst: string;
  verificatie_status: string;
  bewijs_kwaliteit: number;
  oordeel_bron: string | null;
  documentsoort: string | null;
  documentsoort_gezag: string | null;
  documentsoort_versie: string | null;
};

/**
 * Het oordeel voor één claim, zonder database.
 *
 * Apart en puur zodat een toets hem kan narekenen zonder een database op
 * te zetten, en zodat de richtingsregel op één plek staat.
 */
export function herbeoordeelClaim(inv: {
  readonly oudeStatus: string;
  readonly oudeBewijskracht: number;
  readonly betrouwbaarheid: number;
  readonly isPrimaireBron: boolean;
  readonly documentsoort: Documentsoort;
  readonly gezag: Gezag;
  readonly claimTekst: string;
  readonly brondatum: string | null;
}): {
  readonly nieuweStatus: string;
  readonly nieuweBewijskracht: number;
  readonly plafond: number;
  readonly modaliteit: string;
  readonly modaliteitZekerheid: number;
  readonly modaliteitGrondslag: unknown;
  readonly draagbaarAlsFeit: boolean;
  readonly reden: string;
} {
  const plafond = bewijskrachtPlafond(inv.documentsoort, inv.gezag);
  const nieuweBewijskracht = Math.min(inv.oudeBewijskracht, plafond);

  const mag =
    inv.isPrimaireBron &&
    inv.betrouwbaarheid >= 4 &&
    magZelfBevestigen(inv.documentsoort, inv.gezag);

  /* DE RICHTING, EXPLICIET AFGEDWONGEN.
     De nieuwe voorwaarde is de oude PLUS magZelfBevestigen, dus een
     claim die nu mag bevestigen mocht dat ook onder de oude regel. Deze
     module kent daarom nooit een bevestiging TOE: hij laat staan of hij
     trekt in. Dat staat hier als code en niet als aanname, zodat een
     latere wijziging in de voorwaarden hem niet stil kan omdraaien. */
  const nieuweStatus =
    inv.oudeStatus === "bevestigd" && !mag ? "ongeverifieerd" : inv.oudeStatus;

  const mod = bepaalModaliteit({
    tekst: inv.claimTekst,
    documentsoort: inv.documentsoort,
    ...(inv.brondatum === null ? {} : { peildatum: inv.brondatum }),
  });

  const reden =
    nieuweStatus === inv.oudeStatus
      ? `oordeel blijft ${inv.oudeStatus}; documentsoort ${inv.documentsoort} bij gezag ${inv.gezag} ` +
        `geeft plafond ${plafond}`
      : `bevestiging ingetrokken: ${inv.documentsoort} bij gezag ${inv.gezag} mag niet zelf ` +
        `bevestigen (plafond ${plafond})`;

  return {
    nieuweStatus,
    nieuweBewijskracht,
    plafond,
    modaliteit: mod.modaliteit,
    modaliteitZekerheid: mod.zekerheid,
    modaliteitGrondslag: mod.grondslag,
    draagbaarAlsFeit: mod.draagbaarAlsFeit,
    reden,
  };
}

/**
 * Herbeoordeelt claims die nog niet door de huidige motor zijn gewogen.
 *
 * IDEMPOTENT. De selectie pakt alleen rijen waarvan het oordeel van een
 * andere motorversie komt of ontbreekt. Een tweede ronde vindt dus
 * niets meer, en een derde ook niet.
 *
 * DEZELFDE VOORWAARDE ALS DE CLAIMPOORT, en dat moet ook: zou deze
 * selectie smaller zijn dan WACHT_OP_HERBEOORDELING_SQL, dan bleef de
 * poort dicht na een volledige ronde. `herbeoordeeld_op` zit er met
 * opzet NIET in — zie de toelichting bij die constante.
 *
 * HERVATBAAR. Hij werkt in id-orde met een limiet, en elke claim is zijn
 * eigen update plus zijn eigen auditregel. Breekt de ronde af, dan is
 * wat gedaan is klaar en wat niet gedaan is nog te doen — en in dat
 * venster houdt de geldigheidscontrole de niet-herbeoordeelde claims
 * buiten elke beslissing.
 *
 * @param opties.droog rekent alles door en schrijft niets
 */
export async function herbeoordeelClaims(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  opties: { readonly max?: number; readonly droog?: boolean } = {},
): Promise<HerbeoordeelRapport> {
  const max = opties.max ?? 500;
  const droog = opties.droog === true;

  const { rows } = await c.query<ClaimRij>(
    `select u.id, u.gebeurtenis_id, bv.id as versie_id,
            bv.titel, bv.ruwe_tekst, bd.canonieke_url,
            b.sleutel as bron_sleutel, bv.injectie_verdacht,
            b.betrouwbaarheid, b.is_primaire_bron,
            coalesce(bd.gepubliceerd_op, bv.opgehaald_op)::date::text as brondatum,
            u.tekst, u.verificatie_status, u.bewijs_kwaliteit, u.oordeel_bron,
            bv.documentsoort, bv.documentsoort_gezag, bv.documentsoort_versie
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten bd on bd.id = bv.brondocument_id
       join intel.bronnen b on b.id = bd.bron_id
      where u.organisatie_id = $1
        -- LET OP: geen backticks in dit commentaar. Het staat in een
        -- template literal, en een backtick sluit die af — dezelfde
        -- valkuil die dit platform eerder in publiceer.ts en html.ts had.
        --
        -- EXACT dezelfde voorwaarde als WACHT_OP_HERBEOORDELING_SQL in
        -- claimpoort.ts, inclusief de uitsluiting van een menselijk
        -- oordeel. De eerste versie liet die uitsluiting hier weg en
        -- sloeg de menselijke claim in de LUS over. Gevolg: elke ronde
        -- selecteerde hem opnieuw, dus het aantal bekeken claims kwam
        -- nooit op nul en de twee voorwaarden spraken elkaar tegen --
        -- precies de klasse fout die deze constante moest voorkomen.
        -- Een eigen toets ving dat: de tweede ronde zag 1 in plaats van 0.
        and coalesce(u.oordeel_bron, 'motor') <> 'mens'
        and (
          u.modaliteit_versie is distinct from $2
          or bv.documentsoort_versie is distinct from $3
        )
      order by u.id
      limit $4`,
    [organisatieId, MODALITEIT_VERSIE, DOCUMENTSOORT_VERSIE, max],
  );

  let herbeoordeeld = 0;
  let behouden = 0;
  let ingetrokken = 0;
  let verlaagd = 0;
  let menselijk = 0;
  let zonderBron = 0;
  let vraagtControle = 0;
  const perSoort: Record<string, number> = {};
  const gebeurtenissen = new Set<number>();

  /* EEN MENSELIJK OORDEEL BLIJFT STAAN — eis 3 van de opdracht.
     Die claims worden niet geselecteerd (zie de query hierboven), dus
     ze worden ook niet narekend. Hun aantal is een feit over de
     POPULATIE en niet over het werk van deze ronde, en hoort daarom uit
     een eigen telling te komen: zou hij uit de lus komen, dan stond er
     na een volledige ronde plotseling nul. */
  const menselijkRij = await c.query<{ n: number }>(
    `select count(*)::int as n
       from intel.uitspraken u
      where u.organisatie_id = $1 and u.oordeel_bron = 'mens'`,
    [organisatieId],
  );
  menselijk = menselijkRij.rows[0]?.n ?? 0;

  for (const r of rows) {
    if (r.ruwe_tekst.trim().length === 0) zonderBron += 1;

    /* De versie kan nog ongeclassificeerd zijn, of door een oudere motor
       geclassificeerd. Dan hoort dat hier te gebeuren: anders zou de
       claim herbeoordeeld worden tegen een soort die niet van deze motor
       komt, en is het oordeel niet herleidbaar naar één versie. */
    let soort = r.documentsoort as Documentsoort | null;
    let gezag = r.documentsoort_gezag as Gezag | null;
    if (soort === null || gezag === null || r.documentsoort_versie !== DOCUMENTSOORT_VERSIE) {
      const u = classificeerVersie({
        versieId: r.versie_id,
        titel: r.titel,
        tekst: r.ruwe_tekst,
        canoniekeUrl: r.canonieke_url,
        bronSleutel: r.bron_sleutel,
        injectieVerdacht: r.injectie_verdacht,
      });
      soort = u.soort;
      gezag = u.gezag;
      if (!droog) await slaDocumentsoortOp(c, organisatieId, r.versie_id, u);
    }

    const oordeel = herbeoordeelClaim({
      oudeStatus: r.verificatie_status,
      oudeBewijskracht: r.bewijs_kwaliteit,
      betrouwbaarheid: r.betrouwbaarheid,
      isPrimaireBron: r.is_primaire_bron,
      documentsoort: soort,
      gezag,
      claimTekst: r.tekst,
      brondatum: r.brondatum,
    });

    perSoort[soort] = (perSoort[soort] ?? 0) + 1;
    const trektIn = r.verificatie_status === "bevestigd" && oordeel.nieuweStatus !== "bevestigd";
    if (trektIn) {
      ingetrokken += 1;
      if (r.gebeurtenis_id !== null) gebeurtenissen.add(r.gebeurtenis_id);
    } else if (r.verificatie_status === "bevestigd") {
      behouden += 1;
      if (!oordeel.draagbaarAlsFeit) vraagtControle += 1;
    }
    if (oordeel.nieuweBewijskracht < r.bewijs_kwaliteit) verlaagd += 1;
    herbeoordeeld += 1;

    if (droog) continue;

    await c.query(
      `update intel.uitspraken
          set verificatie_status   = $2,
              bewijs_kwaliteit     = $3,
              bewijskracht_plafond = $4,
              modaliteit           = $5,
              modaliteit_zekerheid = $6,
              modaliteit_versie    = $7,
              modaliteit_grondslag = $8,
              oordeel_bron         = 'motor',
              herbeoordeeld_op     = now(),
              bijgewerkt_op        = now()
        where id = $1 and organisatie_id = $9`,
      [
        r.id,
        oordeel.nieuweStatus,
        oordeel.nieuweBewijskracht,
        oordeel.plafond,
        oordeel.modaliteit,
        oordeel.modaliteitZekerheid.toFixed(2),
        MODALITEIT_VERSIE,
        JSON.stringify(oordeel.modaliteitGrondslag),
        organisatieId,
      ],
    );

    /* HET SPOOR. Eén rij per herbeoordeelde claim, met de voor- en
       nawaarde erin. intel.audit_gebeurtenissen is sinds 0001
       append-only, dus dit spoor is niet achteraf te wijzigen — en
       daarmee is de ronde omkeerbaar zonder dat deze module een eigen
       terugdraaipad hoeft te hebben. */
    await c.query(
      `insert into intel.audit_gebeurtenissen
         (organisatie_id, actor_soort, actor_naam, handeling, objectsoort, object_id,
          voor_waarde, na_waarde, motivatie, herkomst)
       values ($1,'systeem','herbeoordeling',$2,'intel.uitspraken',$3,$4,$5,$6,$7)`,
      [
        organisatieId,
        HERBEOORDELING_HANDELING,
        String(r.id),
        JSON.stringify({
          verificatie_status: r.verificatie_status,
          bewijs_kwaliteit: r.bewijs_kwaliteit,
        }),
        JSON.stringify({
          verificatie_status: oordeel.nieuweStatus,
          bewijs_kwaliteit: oordeel.nieuweBewijskracht,
          bewijskracht_plafond: oordeel.plafond,
          modaliteit: oordeel.modaliteit,
          modaliteit_zekerheid: Number(oordeel.modaliteitZekerheid.toFixed(2)),
          documentsoort: soort,
          documentsoort_gezag: gezag,
        }),
        oordeel.reden,
        `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}`,
      ],
    );
  }

  const rapport: HerbeoordeelRapport = {
    bekeken: rows.length,
    herbeoordeeld,
    bevestigingBehouden: behouden,
    bevestigingIngetrokken: ingetrokken,
    bewijskrachtVerlaagd: verlaagd,
    menselijkOvergeslagen: menselijk,
    zonderBrongegevens: zonderBron,
    vraagtMenselijkeControle: vraagtControle,
    perDocumentsoort: perSoort,
    getroffenGebeurtenissen: [...gebeurtenissen].sort((a, b) => a - b),
    droog,
  };

  log.info("herbeoordeling gereed", {
    ...rapport,
    getroffen_gebeurtenissen: rapport.getroffenGebeurtenissen.length,
  });

  return rapport;
}
