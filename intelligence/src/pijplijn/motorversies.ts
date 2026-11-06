/* ============================================================
   PIJPLIJN — de motorversiestempel, op één plek
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT. De string
   "documentsoort-vX + claimmodaliteit-vY" werd op vier plekken met de
   hand samengesteld: in claimpoort.ts (twee keer), in herbeoordeling.ts
   en in de plannerpauze-CLI. Vier formuleringen van dezelfde waarde
   lopen uiteen, en dat is in deze repo al eerder misgegaan met een
   tweede, met de hand bijgehouden gezagskaart.

   Sinds de herbeoordeling op DEZE string selecteert in plaats van op
   een versieveld van het brondocument, is hij niet langer cosmetisch:
   een afwijkende formulering zou een claim onzichtbaar maken voor de
   herbeoordeling, of hem elke ronde opnieuw laten wegen. Daarom staat
   hij hier, en nergens anders.

   WAT ER IN DE STEMPEL HOORT. Elke motor die het OORDEEL over een
   claim kan veranderen. Verandert er een, dan verandert de stempel, en
   dan is elke bestaande claim per definitie "nog niet onder deze motor
   gewogen" — precies het gedrag dat een versiewissel moet hebben.
   ============================================================ */

import { DOCUMENTSOORT_VERSIE } from "./documentsoort.ts";
import { MODALITEIT_VERSIE } from "./claimmodaliteit.ts";
import { CLAIMVORM_VERSIE } from "./claimvorm.ts";
import { DATUMROL_VERSIE } from "./datumrol.ts";
import { VASTSTELLING_VERSIE } from "./vaststelling.ts";

/**
 * De stempel die op intel.uitspraken.herbeoordeeld_onder wordt
 * geschreven, en waarop de claimpoort en de herbeoordeling selecteren.
 *
 * De vorm is bewust leesbaar en niet gehasht: wie in de database kijkt
 * hoort te kunnen zien ONDER WELKE MOTOR een claim is gewogen, zonder
 * een tabel met vingerafdrukken erbij te hoeven zoeken.
 */
/* CLAIMVORM EN DATUMROL HOREN IN DE STEMPEL, om precies de reden die
   de kop hierboven noemt: "elke motor die het OORDEEL over een claim
   kan veranderen". vormpoort.ts beslist de verwoordbaarheid van een
   vorm- of datumclaim op grond van die twee motoren, dus een wijziging
   daarin verandert het oordeel. Zonder ze in de stempel zou een nieuwe
   vormversie de bestaande vormclaims onzichtbaar maken voor de
   herbeoordeling — hetzelfde defect dat deze stempel moest oplossen,
   een laag verder. */
/* VASTSTELLING HOORT ER OOK IN, en sinds 6 november 2026 is dat geen
   theorie meer. De herbeoordeling past de passagetoets toe
   (herbeoordeling.ts), dus steltStukDeClaimVast() kan het oordeel over
   een bestaande claim veranderen — en dan geldt de regel uit de kop
   hierboven: "elke motor die het OORDEEL over een claim kan
   veranderen".

   WAT DEZE TOEVOEGING DOET, en dat is met opzet. De stempel verandert,
   dus elke bestaande claim is per definitie "nog niet onder deze motor
   gewogen" en komt één keer door de herbeoordeling. Dat is precies hoe
   de zes claims uit het ACM-besluit hun passagetoets krijgen: niet via
   een eigen herextractie-engine of een eenmalig script, maar via het
   mechanisme dat hier al voor gebouwd is. De selectie in
   herbeoordeelClaims() is idempotent op deze stempel, dus een tweede
   ronde vindt niets meer. */
export const MOTORVERSIES =
  `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE} + ${CLAIMVORM_VERSIE} + ` +
  `${DATUMROL_VERSIE} + ${VASTSTELLING_VERSIE}`;
