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

/**
 * De stempel die op intel.uitspraken.herbeoordeeld_onder wordt
 * geschreven, en waarop de claimpoort en de herbeoordeling selecteren.
 *
 * De vorm is bewust leesbaar en niet gehasht: wie in de database kijkt
 * hoort te kunnen zien ONDER WELKE MOTOR een claim is gewogen, zonder
 * een tabel met vingerafdrukken erbij te hoeven zoeken.
 */
export const MOTORVERSIES = `${DOCUMENTSOORT_VERSIE} + ${MODALITEIT_VERSIE}`;
