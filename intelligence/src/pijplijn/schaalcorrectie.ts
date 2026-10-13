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

/** De schaalwoorden en hun factor. 'mln'/'mld' komen in persberichten voor. */
const SCHAALFACTOR: Readonly<Record<string, number>> = {
  duizend: 1e3,
  miljoen: 1e6,
  mln: 1e6,
  miljard: 1e9,
  mld: 1e9,
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
};

export type SchaalcorrectieRapport = {
  readonly bekeken: number;
  readonly gevonden: number;
  readonly aangebracht: number;
  readonly overgeslagen: number;
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
  }[];
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
      `select u.id, u.gebeurtenis_id, u.tekst, u.waarde_numeriek::text as waarde_numeriek,
              u.eenheid, u.verificatie_status, u.fenomeen, u.schaalwoord, u.uitdrukking
         from intel.uitspraken u
        where u.organisatie_id = $1
          and u.waarde_numeriek is not null
          /* Al gerectificeerd? Dan is deze rij geschiedenis. */
          and not exists (
            select 1 from intel.uitspraak_correcties k
             where k.vervangen_id = u.id and k.soort = 'rectificatie')
        order by u.id`,
      [organisatieId],
    );

    const regels: SchaalcorrectieRapport["regels"][number][] = [];
    let aangebracht = 0;
    let overgeslagen = 0;

    for (const u of alle) {
      const oud = Number(u.waarde_numeriek);
      const verlies = vindSchaalverlies(u.tekst, oud);
      if (!verlies) continue;

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
          vervangerId: bestaat[0]!.id,
          reden: `overgeslagen: uitspraak ${bestaat[0]!.id} draagt deze waarde al`,
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
         migratie 0025. */
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
           semantiek_herkomst, scope_waarschuwing, horizon)
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
                semantiek_herkomst, scope_waarschuwing, horizon
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
        vervangerId,
        reden: grondslag,
      });
    }

    return {
      bekeken: alle.length,
      gevonden: regels.length,
      aangebracht,
      overgeslagen,
      regels,
    };
  });
}
