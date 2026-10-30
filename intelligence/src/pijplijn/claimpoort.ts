/* ============================================================
   PIJPLIJN — de claimpoort: mag dit bewijs nog gebruikt worden?
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT, en waarom hij GEEN tiende filter in een
   tiende query is.

   R3 verandert wat een bevestigde claim waard is. Maar migratie 0042
   raakt de bestaande rijen niet aan, dus er is een VENSTER: tussen het
   moment waarop de R3-code draait en het moment waarop de historische
   claims zijn herbeoordeeld, staat `intel.uitspraken.verificatie_status`
   voor 46 van de 51 bevestigde claims op een waarde die onder de nieuwe
   regels niet klopt. Gemeten in productie op 30 oktober 2026.

   Een audit over alle lagen die bevestigde claims verbruiken vond 31
   plekken die in dat venster de oude waarde als waarheid behandelen,
   waarvan 9 op een pad dat naar een publiceerbaar artefact leidt:

     besluit/motor.ts   regel 233, 251, 268, 368, 372
     inhoud/concept.ts  regel 189, 552, 1011
     inhoud/publiceer.ts regel 642, 649

   DE VERLEIDING is om in elk van die tien queries een voorwaarde bij te
   schrijven. Dat is precies wat hier NIET gebeurt. Tien voorwaarden
   lopen uiteen; een elfde plek wordt vergeten; en een `and u.modaliteit
   is not null` in een subquery is voor een lezer niet te onderscheiden
   van een optimalisatie.

   DE KEUZE: ÉÉN VOORWAARDE VOORAF.

   De lagen die claims verbruiken draaien niet zolang de populatie
   gemengd is. `eisHerbeoordeling()` kijkt of er nog claims zijn die de
   huidige motor niet heeft gewogen, en gooit dan een niet-herhaalbare
   configuratiefout — dezelfde vorm als de nieuwscontextgrendel uit
   R2.1. Is de herbeoordeling klaar, dan staat in
   `verificatie_status` en `bewijs_kwaliteit` wat er hoort te staan, en
   is elke bestaande query vanzelf juist.

   Dat is sterker dan tien filters, want het faalt DICHT op de enige
   manier die telt: er wordt niets besloten op een gemengde populatie.
   En het is eerlijker, want het zegt tegen de operator wat er aan de
   hand is in plaats van stil minder te vinden.

   GEEN TERUGVAL. Er is met opzet geen vlag die de poort overslaat en
   geen pad dat op de oude uitgeversbetrouwbaarheid terugvalt. De
   opdracht eist dat expliciet, en een noodknop zou precies in de
   situatie gebruikt worden waarin hij het meeste schade doet.

   ------------------------------------------------------------
   WAT DEZE MODULE NIET IS

   Hij is geen tweede claimsysteem en houdt geen eigen administratie bij.
   Hij leest `uitspraken.herbeoordeeld_op`, `uitspraken.modaliteit_versie`
   en `brondocument_versies.documentsoort_versie` — drie velden die de
   herbeoordeling zelf zet — en telt.
   ============================================================ */

import type pg from "pg";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";
import { MODALITEIT_VERSIE, NOODZAKELIJKE_ZEKERHEID } from "./claimmodaliteit.ts";
import { DOCUMENTSOORT_VERSIE, NIET_DRAGENDE_DOCUMENTSOORTEN } from "./documentsoort.ts";

const log = maakLogger("claimpoort");

/**
 * Het SQL-fragment dat zegt of een claim NOG herbeoordeeld moet worden.
 *
 * Als tekstconstante en niet als functie, zodat de telling en de
 * selectie in herbeoordeling.ts aantoonbaar dezelfde voorwaarde
 * gebruiken. Twee formuleringen van dezelfde vraag lopen uiteen; dat is
 * de klasse fouten die dit platform al vaker heeft gemeten.
 *
 * $1 = organisatie_id, $2 = MODALITEIT_VERSIE, $3 = DOCUMENTSOORT_VERSIE
 */
export const WACHT_OP_HERBEOORDELING_SQL = `
  select count(distinct u.id)::int as n
    from intel.uitspraken u
    join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
    join intel.brondocument_versies bv on bv.id = ub.versie_id
   where u.organisatie_id = $1
     and coalesce(u.oordeel_bron, 'motor') <> 'mens'
     and (
       u.modaliteit_versie is distinct from $2
       or bv.documentsoort_versie is distinct from $3
     )`;

/* WAAROM `ub.rol = 'primair'` EN `count(distinct u.id)` — een latent
   defect, gevonden bij de acceptatie van de tweede poort en nog NIET
   zichtbaar in productie.

   `intel.uitspraak_bronnen.rol` is ('primair', 'bevestigend',
   'tegensprekend'). De eerste versie van deze join noemde de rol niet.
   Drie gevolgen, alle drie echt:

     1 EEN CLAIM MET TWEE BINDINGEN WERD DUBBEL GETELD. Deze query gaf
       dan 2 voor één claim. Voor de boolean 'staat de poort dicht'
       maakt dat niets uit, maar het GETAL in de foutregel en in het
       rapport van de herverwerker was fout.

     2 DE HERVERWERKER WOOG ZO'N CLAIM TWEE KEER IN ÉÉN RONDE, met
       mogelijk twee verschillende documentsoorten, en de laatste rij
       won willekeurig. Dezelfde ongenoemde rol stond daar in de
       selectie.

     3 EEN TEGENSPREKEND DOCUMENT KON DE SOORT LEVEREN. De administratie
       dat document X de claim WEERSPREEKT werd dan de grond waarop de
       claim bewijskracht kreeg. Dat is de omgekeerde betekenis.

   De schrijfkant deed het al goed: `schrijfUitspraken()` leidt de
   documentsoort af van de PRIMAIRE versie. De leeskant deed het niet,
   en twee formuleringen van dezelfde vraag lopen uiteen — precies de
   klasse fout die deze constante moest voorkomen.

   GEMETEN IN PRODUCTIE op 30 oktober 2026: 59 claims, alle met exact
   één binding, alle met rol 'primair'. Nul claims zonder primaire
   binding. Het defect was dus latent en de gemeten 46/5-uitslag is er
   niet door geraakt. Het is wél bereikbaar: de bronverificatie en de
   clusterlaag kunnen een tweede binding toevoegen.

   EN EEN CLAIM ZONDER PRIMAIRE BINDING VALT HIER WEG — bewust. Die kan
   namelijk niet 'bevestigd' zijn: de constraint trigger
   `uitspraken_bewijsplicht` (migratie 0003 regel 292-317) weigert dat
   in de database. Hij draagt dus niets, en hem hier meetellen zou de
   poort permanent dicht zetten op een claim die nooit een soort kan
   krijgen. De tweede poort hieronder blokkeert hem alsnog expliciet
   wanneer hij aan een concept hangt. */

/* WAAROM `herbeoordeeld_op` HIER NIET IN STAAT — gevonden door de eigen
   tests, en het was een echte fout.

   De eerste versie van deze voorwaarde begon met
   `u.herbeoordeeld_op is null or ...`. Dat lijkt logisch: een claim die
   nooit is herbeoordeeld, is niet herbeoordeeld. Maar een NIEUWE claim
   wordt niet herbeoordeeld — hij wordt bij zijn geboorte al door de
   huidige motor beoordeeld, in schrijfUitspraken(). Zijn
   `herbeoordeeld_op` blijft dus leeg, en de poort zou permanent dicht
   blijven zodra de pijplijn één nieuwe claim schrijft. Tien
   integratietoetsen vielen daarop om, waaronder de hele R3-eindproef.

   De vraag die telt is niet 'is deze claim ooit herverwerkt' maar
   'draagt hij een oordeel van de HUIDIGE motor'. Dat staat in
   `modaliteit_versie` en `documentsoort_versie`, en die zet zowel de
   pijplijn als de herbeoordeling. `herbeoordeeld_op` blijft bestaan als
   auditgegeven — wanneer woog de herverwerker deze rij — maar is geen
   grond. */

export type HerbeoordeelStand = {
  /** Claims die de huidige motor nog niet heeft gewogen. */
  readonly openstaand: number;
  readonly motorversies: string;
};

/** Hoeveel claims wachten nog op een oordeel van de huidige motor. */
export async function herbeoordeelStand(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
): Promise<HerbeoordeelStand> {
  const { rows } = await c.query<{ n: number }>(WACHT_OP_HERBEOORDELING_SQL, [
    organisatieId,
    MODALITEIT_VERSIE,
    DOCUMENTSOORT_VERSIE,
  ]);
  return {
    openstaand: rows[0]?.n ?? 0,
    motorversies: `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}`,
  };
}

/**
 * Weigert door te gaan zolang er claims op herbeoordeling wachten.
 *
 * NIET-HERHAALBAAR, en dat is bewust: opnieuw proberen leest dezelfde
 * rijen. Er moet eerst een herbeoordeling draaien, en dat is een
 * handeling van een mens of van de daarvoor bedoelde taak — geen
 * kwestie van wachten.
 *
 * @param laag naam van de laag die om bewijs vroeg, voor de foutregel
 */
export async function eisHerbeoordeling(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  laag: string,
): Promise<void> {
  const stand = await herbeoordeelStand(c, organisatieId);
  if (stand.openstaand === 0) return;

  log.fout("claimpoort DICHT", {
    laag,
    openstaand: stand.openstaand,
    motorversies: stand.motorversies,
  });

  throw new IntelFout(
    "configuratie",
    `${laag} kan geen bewijs wegen: ${stand.openstaand} claim(s) zijn nog niet herbeoordeeld ` +
      `onder ${stand.motorversies}. Hun verificatie_status komt van de oude regel waarin de ` +
      `bewijskracht van de UITGEVER kwam en niet van het document, en is dus geen bewijs. ` +
      `Draai 'npm run herbeoordeel' en daarna deze laag opnieuw. Er is met opzet geen ` +
      `terugvaloptie naar de oude betrouwbaarheid.`,
    { herhaalbaar: false },
  );
}

/**
 * Draagt deze claim een bericht?
 *
 * DRIE EISEN, en elke eis sluit een andere fout uit:
 *
 *  1. bevestigd — er is bewijs;
 *  2. de modaliteit is VASTGESTELD met voldoende zekerheid — de zin
 *     stelt iets vast en vraagt of verwacht niets;
 *  3. de documentsoort kan zelf iets vaststellen — een navertelling,
 *     een opinie en een lobbydocument dragen niet, hoe betrouwbaar de
 *     uitgever ook is.
 *
 * Eis 3 stond er eerst niet in. Een audit ving dat: `splitsNaarModaliteit()`
 * in concept.ts toetste alleen eis 1 en 2, waardoor een claim uit een
 * SECUNDAIRE_BERICHTGEVING met een vaststellende zin als feit onder
 * 'Wat er is vastgelegd' kon landen. De zin stelt dan wel iets vast,
 * maar de bron is er niet de bron van.
 */
export function claimDraagt(claim: {
  readonly verificatieStatus: string;
  readonly modaliteit: string | null;
  readonly modaliteitZekerheid: number | null;
  readonly documentsoort: string | null;
}): boolean {
  if (claim.verificatieStatus !== "bevestigd") return false;
  if (claim.modaliteit !== "VASTGESTELD") return false;
  if ((claim.modaliteitZekerheid ?? 0) < NOODZAKELIJKE_ZEKERHEID) return false;
  /* NULL IS NIET DRAGEND. Een document zonder soort is niet
     geclassificeerd, en dat is geen grond om het als vaststellend te
     behandelen. */
  if (claim.documentsoort === null) return false;
  return !NIET_DRAGENDE_DOCUMENTSOORTEN.includes(claim.documentsoort);
}

/** Waarom draagt deze claim niet? Voor de redactie, in één regel. */
export function waaromNietDragend(claim: {
  readonly verificatieStatus: string;
  readonly modaliteit: string | null;
  readonly modaliteitZekerheid: number | null;
  readonly documentsoort: string | null;
}): string | null {
  if (claimDraagt(claim)) return null;
  if (claim.verificatieStatus !== "bevestigd") {
    return `niet bevestigd (${claim.verificatieStatus})`;
  }
  if (claim.documentsoort === null) return "het brondocument is niet geclassificeerd";
  if (NIET_DRAGENDE_DOCUMENTSOORTEN.includes(claim.documentsoort)) {
    return `het brondocument is ${claim.documentsoort} en stelt zelf niets vast`;
  }
  if (claim.modaliteit === null) return "de modaliteit is niet beoordeeld";
  if (claim.modaliteit !== "VASTGESTELD") {
    return `de zin is een ${claim.modaliteit.toLowerCase()} en geen vaststelling`;
  }
  return (
    `de modaliteit is vastgesteld maar met zekerheid ` +
    `${(claim.modaliteitZekerheid ?? 0).toFixed(2)}, onder de drempel ${NOODZAKELIJKE_ZEKERHEID}`
  );
}

/* ============================================================
   DE TWEEDE POORT — goedkeuring en publicatie wegen de ACTUELE claim
   ------------------------------------------------------------
   WAAROM ER EEN TWEEDE POORT NODIG IS, en waarom de eerste niet
   volstond. Dit is een zelfcorrectie: ik heb in het acceptatierapport
   geschreven dat `eisHerbeoordeling()` de keten dekt. Dat was te ruim
   gesteld, en de audit had gelijk.

   `eisHerbeoordeling()` staat vóór de besluitmotor, de nieuwsselectie,
   de voorstellenlaag en de conceptgeneratie. Dat zijn de lagen die
   bewijs WEGEN. Maar goedkeuren en publiceren wegen geen bewijs — ze
   LEUNEN op een weging die eerder is gedaan en in een kolom is
   opgeslagen:

     publiceer()   regel 333  leest `v.poorten_geslaagd`, een boolean
                              die bij de conceptbouw is gezet
     keurGoed()               toetste gebruiker, recht en vier ogen, en
                              geen enkel uitspraakveld

   Tussen het bouwen van een concept en het goedkeuren ervan zit
   menselijke tijd — uren, dagen. In dat venster kan de populatie
   veranderen: een herbeoordelingsronde trekt een bevestiging in, een
   schaalcorrectie voegt een ongeclassificeerde kloon toe, een
   herclassificatie verlaagt een plafond. Een opgeslagen boolean weet
   daar niets van. Hij was waar toen hij werd geschreven, en dat is iets
   anders dan waar.

   DAAROM: vlak vóór goedkeuren en vlak vóór publiceren wordt de
   ACTUELE toestand van elke gebonden claim opnieuw gelezen. Niet de
   opgeslagen uitslag — de rijen zelf.

   ------------------------------------------------------------
   WAAROM DIT GEEN EXCEPTIE GOOIT MAAR EEN UITSLAG TERUGGEEFT

   De opdracht eist dat een blokkade AUDITEERBAAR wordt vastgelegd. Dat
   kan niet met een exceptie: een `throw` rolt de transactie terug, en
   daarmee ook de auditregel die de blokkade verklaart. Dat is geen
   detail maar het verschil tussen een vastgelegde weigering en een
   weigering die alleen in een logbestand bestaat.

   Dus: `toetsGebondenBewijs()` geeft een UITSLAG, de aanroeper legt de
   blokkade vast met `legBewijsblokkadeVast()` en de transactie COMMIT.
   Dat is dezelfde vorm die `publiceer()` al had met zijn `weiger()`:
   een claim die niet meer draagt is een normale uitkomst van het
   redactionele proces, geen uitzondering. Een onbevoegde goedkeurder is
   wél een uitzondering en blijft een exceptie.

   ------------------------------------------------------------
   WAAROM `for share of u` — DE RACE IS ECHT

   Zonder slot bestaat deze ordening:

     t0  goedkeuring leest claim 7: bevestigd, draagt
     t1  herbeoordeling trekt claim 7 in en COMMIT
     t2  goedkeuring schrijft status = 'goedgekeurd'

   De goedkeuring is dan gebonden aan bewijs dat op het moment van
   schrijven al was ingetrokken. `for share of u` neemt een gedeeld slot
   op precies de uitspraakrijen die dit concept draagt. De
   herbeoordeling doet een `update` op die rijen en wacht dus tot wij
   committen. Daarna trekt zij in, en de PUBLICATIE — die opnieuw toetst
   — blokkeert. De omgekeerde orde (eerst intrekken, dan goedkeuren) is
   ongevaarlijk: dan ziet deze toets de intrekking gewoon.

   `metOrganisatie()` zet de transactie al om elke route en elke CLI
   heen (kern/db.ts regel 103-111), dus het slot valt samen met de
   handeling. Dat is de hele consistentiegarantie: lees met een slot en
   schrijf in dezelfde transactie.

   EN EEN SPOED-UITWEG. Een slot dat eeuwig wacht hangt een
   dashboardverzoek op. Daarom `lock_timeout` van vijf seconden, met een
   SAVEPOINT eromheen: een mislukte opdracht zet een
   PostgreSQL-transactie in de afgebroken stand, en dan zou de
   auditregel er niet meer in kunnen. Met het savepoint blijft de
   transactie bruikbaar en wordt de botsing een nette, herhaalbare
   blokkade.
   ============================================================ */

export type GebondenClaim = {
  readonly uitspraakId: number;
  readonly rol: string;
  readonly tekst: string;
  readonly verificatieStatus: string;
  readonly modaliteit: string | null;
  readonly modaliteitZekerheid: number | null;
  readonly modaliteitVersie: string | null;
  readonly documentsoort: string | null;
  readonly documentsoortVersie: string | null;
  readonly bewijsKwaliteit: number;
  readonly bewijskrachtPlafond: number | null;
  readonly oordeelBron: string;
  readonly primaireVersieId: number | null;
  readonly versieInInvoer: boolean;
  readonly draagt: boolean;
  readonly waarom: string | null;
};

export type BewijsUitslag = {
  readonly inhoudVersieId: number;
  readonly claims: readonly GebondenClaim[];
  readonly blokkades: readonly string[];
  readonly dragendeKern: number;
  readonly motorversies: string;
};

/** Draagt dit concept nu nog? Geen blokkades betekent ja. */
export function bewijsDraagt(u: BewijsUitslag): boolean {
  return u.blokkades.length === 0;
}

/**
 * Leest de ACTUELE toestand van elke claim die aan deze inhoudsversie
 * is gebonden, met een gedeeld slot erop, en zegt wat eraan schort.
 *
 * Geeft een uitslag en gooit niet: zie de kop van deze sectie.
 */
export async function toetsGebondenBewijs(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  inhoudVersieId: number,
): Promise<BewijsUitslag> {
  const motorversies = `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}`;
  const blokkades: string[] = [];

  /* DE HELE POPULATIE EERST. Hangt er ook maar één claim nog op
     herbeoordeling, dan is geen enkele weging op deze versie te
     vertrouwen — ook niet als de claims ONDER dit concept toevallig al
     gewogen zijn. Een score vergelijkt met andere gebeurtenissen, en
     die kunnen wel gemengd zijn. */
  const stand = await herbeoordeelStand(c, organisatieId);
  if (stand.openstaand > 0) {
    blokkades.push(
      `${stand.openstaand} claim(s) in deze organisatie wachten nog op herbeoordeling onder ` +
        `${motorversies}; draai 'npm run herbeoordeel' en probeer het daarna opnieuw`,
    );
  }

  const invoer = await c.query<{ invoer_versies: (number | string)[] | null }>(
    "select invoer_versies from intel.inhoud_versies where organisatie_id = $1 and id = $2",
    [organisatieId, inhoudVersieId],
  );
  if (invoer.rows.length === 0) {
    return {
      inhoudVersieId,
      claims: [],
      blokkades: [`inhoudsversie ${inhoudVersieId} bestaat niet in organisatie ${organisatieId}`],
      dragendeKern: 0,
      motorversies,
    };
  }
  /* ALS STRINGS VERGELIJKEN, en dat is geen slordigheid maar een
     gemeten valkuil. kern/db.ts zet een typeparser voor INT8 naar
     number (regel 27), maar dat geldt voor de SCALAIRE int8 — niet voor
     het ARRAY-type `_int8` (oid 1016), dat een eigen parser heeft. Een
     `bigint[]`-kolom komt daarom terug als ['1','2'] en niet als
     [1,2]. Mijn eerste versie deed `.includes(number)` en blokkeerde
     daardoor ELKE legitiem gegenereerde conceptversie: de R3-eindproef
     meldde 'bronversie 1 staat niet in de vastgelegde invoer' terwijl
     hij er wel in stond. Via String() aan beide kanten maakt het niet
     meer uit welke parser er geldt. */
  const invoerVersies = new Set(
    (invoer.rows[0]!.invoer_versies ?? []).map((v) => String(v)),
  );

  /* HET SLOT, met een savepoint eromheen. Zie de kop. */
  await c.query("savepoint bewijsslot");
  let rijen: {
    uitspraak_id: number;
    rol: string;
    tekst: string;
    verificatie_status: string;
    modaliteit: string | null;
    modaliteit_zekerheid: string | null;
    modaliteit_versie: string | null;
    documentsoort: string | null;
    documentsoort_versie: string | null;
    bewijs_kwaliteit: number;
    bewijskracht_plafond: number | null;
    oordeel_bron: string | null;
    primaire_versie_id: number | null;
  }[];
  try {
    await c.query("set local lock_timeout = '5s'");
    const r = await c.query<(typeof rijen)[number]>(
      /* GEEN BACKTICKS IN DIT COMMENTAAR: de query staat in een template
         literal en een backtick sluit die af.
         De join op rol = 'primair' is dezelfde als in
         WACHT_OP_HERBEOORDELING_SQL en in de herverwerker; zie de
         toelichting daar. Een left join, want een claim ZONDER primaire
         binding moet hier zichtbaar worden en niet wegvallen. */
      `select iu.uitspraak_id, iu.rol, u.tekst, u.verificatie_status,
              u.modaliteit, u.modaliteit_zekerheid::text as modaliteit_zekerheid,
              u.modaliteit_versie, u.bewijs_kwaliteit, u.bewijskracht_plafond,
              u.oordeel_bron, bv.documentsoort, bv.documentsoort_versie,
              bv.id as primaire_versie_id
         from intel.inhoud_uitspraken iu
         join intel.uitspraken u on u.id = iu.uitspraak_id
         left join intel.uitspraak_bronnen ub
                on ub.uitspraak_id = u.id and ub.rol = 'primair'
         left join intel.brondocument_versies bv on bv.id = ub.versie_id
        where iu.organisatie_id = $1 and iu.inhoud_versie_id = $2
        order by u.id
          for share of u`,
      [organisatieId, inhoudVersieId],
    );
    rijen = r.rows;
    await c.query("release savepoint bewijsslot");
  } catch (e) {
    await c.query("rollback to savepoint bewijsslot");
    const code = (e as { code?: string }).code ?? "";
    log.waarschuwing("bewijsslot niet verkregen", { inhoudVersieId, code });
    return {
      inhoudVersieId,
      claims: [],
      blokkades: [
        `de gebonden claims konden niet met een slot gelezen worden (${code || "onbekend"}); ` +
          `er loopt vermoedelijk een herbeoordeling. Probeer het opnieuw zodra die klaar is`,
      ],
      dragendeKern: 0,
      motorversies,
    };
  }

  const claims: GebondenClaim[] = rijen.map((r) => {
    const zekerheid = r.modaliteit_zekerheid === null ? null : Number(r.modaliteit_zekerheid);
    const kern = {
      verificatieStatus: r.verificatie_status,
      modaliteit: r.modaliteit,
      modaliteitZekerheid: zekerheid,
      documentsoort: r.documentsoort,
    };
    return {
      uitspraakId: r.uitspraak_id,
      rol: r.rol,
      tekst: r.tekst,
      verificatieStatus: r.verificatie_status,
      modaliteit: r.modaliteit,
      modaliteitZekerheid: zekerheid,
      modaliteitVersie: r.modaliteit_versie,
      documentsoort: r.documentsoort,
      documentsoortVersie: r.documentsoort_versie,
      bewijsKwaliteit: r.bewijs_kwaliteit,
      bewijskrachtPlafond: r.bewijskracht_plafond,
      oordeelBron: r.oordeel_bron ?? "motor",
      primaireVersieId: r.primaire_versie_id,
      versieInInvoer:
        r.primaire_versie_id !== null && invoerVersies.has(String(r.primaire_versie_id)),
      draagt: claimDraagt(kern),
      waarom: waaromNietDragend(kern),
    };
  });

  for (const k of claims) {
    const naam = `claim ${k.uitspraakId} (${k.rol})`;

    /* 1. DE BINDING NAAR DE BRON. */
    if (k.primaireVersieId === null) {
      blokkades.push(`${naam} heeft geen primaire bronbinding meer; zonder bron geen bewijs`);
      continue;
    }
    if (!k.versieInInvoer) {
      blokkades.push(
        `${naam} hangt aan bronversie ${k.primaireVersieId}, die niet in de vastgelegde invoer ` +
          `van dit concept staat; de koppeling tussen concept, claim en bron is gewijzigd`,
      );
    }

    /* 2. DE CLASSIFICATIEVERSIE.
       De documentsoort is machinewerk en moet altijd van de huidige
       motor komen. De MODALITEIT mag van een mens komen; dan staat zijn
       oordeel en eisen we er geen motorversie bij. Dat is eis 3 van de
       opdracht: een menselijke beoordeling wordt niet overschreven, en
       dus ook niet stilzwijgend ongeldig verklaard. */
    if (k.documentsoortVersie !== DOCUMENTSOORT_VERSIE) {
      blokkades.push(
        `${naam} rust op een documentclassificatie van ` +
          `${k.documentsoortVersie ?? "GEEN"} in plaats van ${DOCUMENTSOORT_VERSIE}`,
      );
    }
    if (k.oordeelBron !== "mens" && k.modaliteitVersie !== MODALITEIT_VERSIE) {
      blokkades.push(
        `${naam} draagt een modaliteitsoordeel van ` +
          `${k.modaliteitVersie ?? "GEEN"} in plaats van ${MODALITEIT_VERSIE}`,
      );
    }

    /* 3. HET PLAFOND. Een bewijskracht boven het plafond betekent dat
       de rij nog de oude, uit de UITGEVER afgeleide sterkte draagt. */
    if (k.bewijskrachtPlafond === null) {
      blokkades.push(`${naam} heeft geen bewijskrachtplafond; de soort is niet gewogen`);
    } else if (k.bewijsKwaliteit > k.bewijskrachtPlafond) {
      blokkades.push(
        `${naam} staat op bewijskracht ${k.bewijsKwaliteit} boven zijn plafond ` +
          `${k.bewijskrachtPlafond}; dat is de oude uitgeversbetrouwbaarheid en geen bewijs`,
      );
    }

    /* 4. DRAAGT DE KERNCLAIM NOG. Alleen voor rol 'kern': een
       ondersteunende of contextclaim hoeft niet vast te staan, die
       staat in de tekst als wat hij is. */
    if (k.rol === "kern" && !k.draagt) {
      blokkades.push(`${naam} draagt niet meer: ${k.waarom}`);
    }
  }

  const dragendeKern = claims.filter((k) => k.rol === "kern" && k.draagt).length;
  if (claims.length === 0) {
    blokkades.push("er is geen enkele uitspraak aan deze versie gebonden; dan is er geen bewijs");
  } else if (dragendeKern === 0) {
    blokkades.push("geen enkele gebonden kernclaim draagt nog; er is niets om op te publiceren");
  }

  return { inhoudVersieId, claims, blokkades, dragendeKern, motorversies };
}

/**
 * Legt een bewijsblokkade vast in het publicatiebesluitenlogboek.
 *
 * `automatisch_geblokkeerd` bestond al als toegestaan besluit (migratie
 * 0004 regel 249-250), dus hier is geen schemawijziging voor nodig. De
 * tabel is append-only sinds dezelfde migratie, dus dit is niet te
 * wissen en niet te herschrijven.
 *
 * MOET VÓÓR DE COMMIT GEBEUREN EN ZONDER DAARNA TE GOOIEN. Een exceptie
 * rolt deze regel mee terug; zie de kop van deze sectie.
 */
export async function legBewijsblokkadeVast(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  uitslag: BewijsUitslag,
  handeling: string,
): Promise<void> {
  await c.query(
    `insert into intel.publicatiebesluiten
       (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie, poortresultaten)
     values ($1, $2, 'automatisch_geblokkeerd', 'systeem', $3, $4)`,
    [
      organisatieId,
      uitslag.inhoudVersieId,
      `${handeling} geblokkeerd door de claimpoort: ${uitslag.blokkades.join(" | ")}`,
      JSON.stringify({
        handeling,
        motorversies: uitslag.motorversies,
        blokkades: uitslag.blokkades,
        dragendeKern: uitslag.dragendeKern,
        claims: uitslag.claims.map((k) => ({
          uitspraakId: k.uitspraakId,
          rol: k.rol,
          verificatieStatus: k.verificatieStatus,
          modaliteit: k.modaliteit,
          modaliteitZekerheid: k.modaliteitZekerheid,
          modaliteitVersie: k.modaliteitVersie,
          documentsoort: k.documentsoort,
          documentsoortVersie: k.documentsoortVersie,
          bewijsKwaliteit: k.bewijsKwaliteit,
          bewijskrachtPlafond: k.bewijskrachtPlafond,
          oordeelBron: k.oordeelBron,
          primaireVersieId: k.primaireVersieId,
          versieInInvoer: k.versieInInvoer,
          draagt: k.draagt,
          waarom: k.waarom,
        })),
      }),
    ],
  );
  log.fout("bewijspoort DICHT", {
    handeling,
    inhoudVersieId: uitslag.inhoudVersieId,
    blokkades: uitslag.blokkades.length,
  });
}
