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
  EIGEN_GEZAG_NAMEN,
  magZelfBevestigen,
  type Documentsoort,
  type Gezag,
} from "./documentsoort.ts";
import { beoordeelPassagegrond } from "./uitspraken.ts";
import type { Documentvorm } from "./documentvorm.ts";
import { classificeerVersie, slaDocumentsoortOp } from "./documentclassificatie.ts";
import { MOTORVERSIES } from "./motorversies.ts";

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
  /** Bevestigingen die de PASSAGETOETS intrekt, los van het plafond. */
  readonly passageIngetrokken: number;
  /** Claims waarvoor de passagetoets niet is gelopen (geen vorm, of niet bevestigd). */
  readonly passageNietGelopen: number;
  readonly perPassageUitslag: Readonly<Record<string, number>>;
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
  /* VOOR DE PASSAGETOETS. documentvorm hoort bij het STUK, claimvorm
     bij de CLAIM; beide bepalen of de claim langs de toets moet. */
  documentvorm: string | null;
  claimvorm: string | null;
  bewijsniveau: string | null;
  verwoordbaar: string | null;
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
  /* ---- DE PASSAGETOETS, optioneel meegegeven ----------------------
     OPTIONEEL EN NIET VERPLICHT, met opzet. herbeoordeelClaim() wordt
     ook aangeroepen door toetsen die alleen de plafond- en
     modaliteitsregel narekenen; die hoeven geen brontekst op te
     tuigen. Ontbreekt `stuk`, dan vervalt de passagetoets en is het
     gedrag exact als voorheen.

     Ontbreekt de documentTEKST terwijl `stuk` er wel is, dan vervalt
     de toets ook — steltStukDeClaimVast() is eenzijdig en blokkeert
     alleen bij positief bewijs. Zie beoordeelPassagegrond(). */
  readonly stuk?: {
    readonly documentTitel: string;
    readonly documentTekst: string;
    readonly documentvorm: Documentvorm;
    readonly claimvorm: string | null;
    readonly eigenGezagNamen: readonly string[];
  };
}): {
  readonly nieuweStatus: string;
  readonly nieuweBewijskracht: number;
  readonly plafond: number;
  readonly modaliteit: string;
  readonly modaliteitZekerheid: number;
  readonly modaliteitGrondslag: unknown;
  readonly draagbaarAlsFeit: boolean;
  readonly reden: string;
  /** De uitslag van de passagetoets, of null als hij niet is gelopen. */
  readonly passageUitslag: string | null;
  /** Trekt de passagetoets deze bevestiging in? */
  readonly passageTrektIn: boolean;
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
  const statusNaPlafond =
    inv.oudeStatus === "bevestigd" && !mag ? "ongeverifieerd" : inv.oudeStatus;

  const mod = bepaalModaliteit({
    tekst: inv.claimTekst,
    documentsoort: inv.documentsoort,
    ...(inv.brondatum === null ? {} : { peildatum: inv.brondatum }),
  });

  /* ---------------------------------------------------------------
     DE PASSAGETOETS, MET EXACT HETZELFDE ALGORITME ALS DE SCHRIJFWEG
     ---------------------------------------------------------------
     HET GEMETEN DEFECT, productie 6 november 2026. Claim 138 stond op
     bevestigd met bewijsniveau DIRECT_BEVESTIGD en de reden "bron
     acm-besluiten (OFFICIEEL_BESLUIT / BEVOEGD_GEZAG) noemt dit feit
     in zijn eigen publicatie". De tekst begint met "Jumbo stelt dat
     ..." en staat in de sectie 'Standpunten van partijen'. Het
     standpunt van een supermarkt stond dus als vaststelling van de
     toezichthouder in de database.

     magZelfBevestigen() kon dat niet zien: die kijkt naar de SOORT en
     het GEZAG van het stuk, en een ACM-besluit haalt beide. De vraag
     is niet of het stuk kan vaststellen, maar of DEZE PASSAGE dat
     doet. Dat is precies wat beoordeelPassagegrond() beantwoordt, en
     die functie wordt ook door schrijfUitspraken() aangeroepen — één
     algoritme, twee aanroepers.

     DE RICHTING BLIJFT EENZIJDIG. De passagetoets kan alleen
     INTREKKEN: hij wordt pas gesteld als de oude status 'bevestigd'
     is, en hij kent nooit een bevestiging toe. Dat is dezelfde
     eigenschap die de kop van dit bestand voor de plafondregel
     beschrijft, en om dezelfde reden: een halve ronde die kan
     promoveren is erger dan geen ronde. */
  let passageUitslag: string | null = null;
  let passageTrektIn = false;
  let passageReden = "";
  if (inv.stuk !== undefined && statusNaPlafond === "bevestigd") {
    const grond = beoordeelPassagegrond({
      claimTekst: inv.claimTekst,
      claimvorm: inv.stuk.claimvorm,
      documentTitel: inv.stuk.documentTitel,
      documentTekst: inv.stuk.documentTekst,
      documentsoort: inv.documentsoort,
      gezag: inv.gezag,
      documentvorm: inv.stuk.documentvorm,
      modaliteit: mod.modaliteit,
      eigenGezagNamen: inv.stuk.eigenGezagNamen,
    });
    passageUitslag = grond.vaststelling.uitslag;
    passageTrektIn = grond.zonderGrondslag;
    if (passageTrektIn) {
      passageReden =
        `bevestiging ingetrokken op de passagetoets: ${grond.vaststelling.uitslag} — ` +
        `${grond.vaststelling.reden}; de claim moest langs de toets via ` +
        `${grond.langsPassageVia}`;
    }
  }

  const nieuweStatus = passageTrektIn ? "ongeverifieerd" : statusNaPlafond;

  const reden = passageTrektIn
    ? passageReden
    : nieuweStatus === inv.oudeStatus
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
    passageUitslag,
    passageTrektIn,
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
            -- ALLEEN DE ECHTE PUBLICATIEDATUM, GEEN TERUGVAL OP
            -- opgehaald_op. Dit veld is de peildatum voor
            -- bepaalModaliteit(), en daar bepaalt hij of een zin over
            -- een jaartal TERUGKIJKT of VOORUITKIJKT.
            --
            -- GEMETEN OP 6 NOVEMBER 2026, en dit was een echte
            -- promotie. Het ACM-besluit (versie 4394) heeft
            -- gepubliceerd_op = null met datum_herkomst 'onbekend': de
            -- PDF-route kon geen publicatiedatum vaststellen. De oude
            -- coalesce viel dan terug op opgehaald_op, dus op ONZE
            -- klok. Gevolg: noemtAfgeslotenJaar() vuurde wel en de
            -- modaliteitszekerheid sprong van 0,35 naar 0,80 -- over de
            -- drempel NOODZAKELIJKE_ZEKERHEID (0,50) heen. Het aantal
            -- claims dat claimDraagt() als feitdragend ziet ging van 10
            -- naar 31: 22 claims werden stil tot feit gepromoveerd,
            -- waaronder kale ECLI-verwijzingen.
            --
            -- schrijfUitspraken() deed het al goed: clusteren.ts geeft
            -- 'peildatum: undefined' zodra gepubliceerd_op null is, met
            -- de toelichting dat het ervan afhangt "wanneer de
            -- schrijver hem opschreef -- niet van onze klok". Deze
            -- regel liet de herbeoordeling van die regel afwijken.
            --
            -- Zonder terugval is brondatum null, laat herbeoordeelClaim()
            -- de peildatum vervallen en blijft het jaartalsignaal uit --
            -- dezelfde uitkomst als de schrijfweg. Gemeten na de
            -- correctie: dragend 10 -> 9, nul promoties, en claim 125
            -- wordt terecht ingetrokken in plaats van gepromoveerd.
            --
            -- 349 brondocumenten hebben geen gepubliceerd_op, dus dit
            -- is geen eenmalig geval. LET OP: de andere coalesce-plekken
            -- in deze repo (bronverificatie, nieuwsselectie, publiceer,
            -- dashboard) zijn WEERGAVE- en RECENTHEIDSdatums met een
            -- andere betekenis; die horen niet mee te veranderen.
            bd.gepubliceerd_op::date::text as brondatum,
            u.tekst, u.verificatie_status, u.bewijs_kwaliteit, u.oordeel_bron,
            bv.documentsoort, bv.documentsoort_gezag, bv.documentsoort_versie,
            bv.documentvorm, u.claimvorm, u.bewijsniveau, u.verwoordbaar
       from intel.uitspraken u
       -- ROL = PRIMAIR, en dat is een correctie. Zonder die voorwaarde
       -- gaf een claim met twee bindingen TWEE rijen: hij werd in
       -- dezelfde ronde twee keer gewogen, met mogelijk twee
       -- verschillende documentsoorten, en de laatste rij won
       -- willekeurig. Een TEGENSPREKEND document kon zo de soort
       -- leveren waarop de claim bewijskracht kreeg -- de omgekeerde
       -- betekenis van die binding. De schrijfkant deed het al goed:
       -- schrijfUitspraken leidt de soort af van de primaire versie.
       -- Zie de uitgebreide toelichting bij
       -- WACHT_OP_HERBEOORDELING_SQL in claimpoort.ts.
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
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
        --
        -- SINDS 0048 HANGT DE GREEP AAN DE CLAIM EN NIET AAN HET
        -- DOCUMENT. De oude tweede helft las
        -- bv.documentsoort_versie, en dat veld wordt door de taak
        -- documentclassificatie (prioriteit 21) bijgewerkt voordat deze
        -- taak (22) kijkt. Gemeten op 1 november 2026 na de v2-uitrol:
        -- 3753 van 3753 versies op documentsoort-v2 en deze selectie zag
        -- 0 claims, terwijl claim 29 nog op bewijs_kwaliteit 2 stond bij
        -- een plafond van 1.
        and coalesce(u.oordeel_bron, 'motor') <> 'mens'
        and u.herbeoordeeld_onder is distinct from $2
      order by u.id
      limit $3`,
    [organisatieId, MOTORVERSIES, max],
  );

  let herbeoordeeld = 0;
  let behouden = 0;
  let ingetrokken = 0;
  let verlaagd = 0;
  let menselijk = 0;
  let zonderBron = 0;
  let vraagtControle = 0;
  let passageIngetrokken = 0;
  let passageNietGelopen = 0;
  const perPassageUitslag: Record<string, number> = {};
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
      /* DE DOCUMENTCONTEXT. De query haalde ruwe_tekst en titel al op;
         ze werden alleen niet doorgegeven. documentvorm is er nu bij,
         want zonder vorm kan vormKanVaststellen() niet antwoorden en
         valt de passagetoets stil terug op 'niet officieel'. Is de
         vorm nog niet geclassificeerd, dan blijft hij null en vervalt
         de toets — eenzijdig, zoals de rest. */
      ...(r.documentvorm === null
        ? {}
        : {
            stuk: {
              documentTitel: r.titel,
              documentTekst: r.ruwe_tekst,
              documentvorm: r.documentvorm as Documentvorm,
              claimvorm: r.claimvorm,
              eigenGezagNamen: EIGEN_GEZAG_NAMEN[r.bron_sleutel] ?? [],
            },
          }),
    });

    perSoort[soort] = (perSoort[soort] ?? 0) + 1;
    if (oordeel.passageUitslag === null) passageNietGelopen += 1;
    if (oordeel.passageTrektIn) {
      passageIngetrokken += 1;
      perPassageUitslag[oordeel.passageUitslag ?? "onbekend"] =
        (perPassageUitslag[oordeel.passageUitslag ?? "onbekend"] ?? 0) + 1;
    }
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
              /* ---- AFHANKELIJKE STATUSSEN, IN DEZELFDE UPDATE ----
                 EIS 4 VAN DE OPDRACHT: bewijsniveau en
                 verificatiestatus mogen niet met elkaar in strijd
                 zijn, en de verwoordbaarheid moet opnieuw worden
                 bepaald zodra de onderliggende verificatie verandert.

                 Een claim die zijn bevestiging verliest maar
                 DIRECT_BEVESTIGD houdt, is precies die strijd: 0055
                 staat dat toe (de CHECK eist alleen het omgekeerde),
                 dus een laag die op bewijsniveau filtert zou hem nog
                 als hard bewijs zien. Het niveau gaat daarom op null,
                 en de eerstvolgende semantiekronde vult hem opnieuw —
                 vulBewijsniveauIn() selecteert standaard precies op
                 'bewijsniveau is null'. Dat is het BESTAANDE
                 mechanisme -- en let op: GEEN backticks in dit
                 commentaar, want het staat in een template literal.
                 Dezelfde valkuil die de SELECT hierboven al noemt.

                 De verwoordbaarheid gaat alleen van 'VERWOORDBAAR'
                 naar 'VERIFICATIE_NODIG'. Alle andere waarden blijven
                 staan: die drukken al een beperking uit, en ze
                 omzetten zou een oordeel overschrijven dat niet door
                 deze ronde is weerlegd. De CASE leest de OUDE waarde,
                 want een UPDATE evalueert al zijn uitdrukkingen tegen
                 de rij van vóór de wijziging.

                 IN DEZELFDE UPDATE, om de reden die bij de stempel
                 hieronder staat: in twee statements bestaat er een
                 venster waarin de status is ingetrokken en het niveau
                 nog hard bewijs beweert. */
              bewijsniveau         = case when $11 then null else bewijsniveau end,
              bewijsniveau_reden   = case when $11 then null else bewijsniveau_reden end,
              bewijsniveau_op      = case when $11 then null else bewijsniveau_op end,
              verwoordbaar         = case when $11 and verwoordbaar = 'VERWOORDBAAR'
                                          then 'VERIFICATIE_NODIG' else verwoordbaar end,
              verwoordbaar_reden   = case when $11 and verwoordbaar = 'VERWOORDBAAR'
                                          then $12 else verwoordbaar_reden end,
              verwoordbaar_op      = case when $11 and verwoordbaar = 'VERWOORDBAAR'
                                          then now() else verwoordbaar_op end,
              herbeoordeeld_op     = now(),
              /* DE STEMPEL, EN HIJ MOET IN DEZELFDE UPDATE STAAN.
                 Zou hij in een tweede statement staan, dan bestaat er
                 een venster waarin het oordeel is bijgewerkt maar de
                 stempel niet; de volgende ronde weegt de claim dan
                 opnieuw en de telling komt nooit op nul. In één update
                 is de idempotentie een eigenschap van de transactie en
                 niet van de orde waarin twee queries slagen. */
              herbeoordeeld_onder  = $10,
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
        MOTORVERSIES,
        trektIn,
        "de bevestiging van deze claim is bij de herbeoordeling ingetrokken, " +
          "dus de verwoordbaarheid vraagt opnieuw verificatie",
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
          /* DE OORSPRONKELIJKE STAAT, zodat de ronde omkeerbaar is
             zonder dat deze module een eigen terugdraaipad heeft —
             eis 3 van de opdracht. */
          bewijsniveau: r.bewijsniveau,
          verwoordbaar: r.verwoordbaar,
        }),
        JSON.stringify({
          verificatie_status: oordeel.nieuweStatus,
          bewijs_kwaliteit: oordeel.nieuweBewijskracht,
          bewijskracht_plafond: oordeel.plafond,
          modaliteit: oordeel.modaliteit,
          modaliteit_zekerheid: Number(oordeel.modaliteitZekerheid.toFixed(2)),
          documentsoort: soort,
          documentsoort_gezag: gezag,
          /* DE PASSAGE-UITSLAG HOORT IN HET SPOOR. Zonder deze twee
             velden is een intrekking op de passagetoets niet te
             scheiden van een intrekking op het plafond, en dan is de
             ronde niet na te meten. */
          passage_uitslag: oordeel.passageUitslag,
          passage_trekt_in: oordeel.passageTrektIn,
          bewijsniveau_gewist: trektIn,
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
    passageIngetrokken,
    passageNietGelopen,
    perPassageUitslag,
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
