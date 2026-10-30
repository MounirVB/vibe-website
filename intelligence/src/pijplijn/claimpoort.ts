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
  select count(*)::int as n
    from intel.uitspraken u
    join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
    join intel.brondocument_versies bv on bv.id = ub.versie_id
   where u.organisatie_id = $1
     and coalesce(u.oordeel_bron, 'motor') <> 'mens'
     and (
       u.modaliteit_versie is distinct from $2
       or bv.documentsoort_versie is distinct from $3
     )`;

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
