/* ============================================================
   PIJPLIJN — is het oorspronkelijke besluit ook bij het gezag gezien?
   ------------------------------------------------------------
   WAT DIT OPLOST, en waarom het een eigen laag is.

   `documentsoort.ts` stelt vast DAT een document een besluit van een
   ander gezag navertelt, en zet dat gezag in `beschrijftBesluitVan`.
   Die navertelling draagt geen eigen bewijs: bewijskracht 2, niet
   bevestigd. Dat is veilig, maar het is niet het eindstation. De
   opdracht zegt het zo:

     "Als een document een officieel besluit beschrijft, moet de motor
      waar mogelijk het oorspronkelijke besluit bij ACM of de betreffende
      bevoegde instantie verifiëren. Zonder die verificatie blijft de
      bewijskracht beperkt."

   Deze module doet dat verifiëren, en doet het binnen de verzameling
   documenten die dit platform AL heeft opgehaald.

   ------------------------------------------------------------
   GEEN NETWERKAANROEP, EN DAT IS EEN KEUZE MET EEN REDEN

   De verleiding is om bij acm.nl te gaan kijken. Dat gebeurt hier niet:

     1. de collector heeft al een robots- en TDM-discipline per bron, en
        een losse fetch uit de verificatielaag omzeilt die;
     2. een netwerkaanroep in een wachtrijtaak maakt de uitslag
        afhankelijk van de beschikbaarheid van een derde partij. Gemeten
        op 29 oktober 2026: tenderned gaf 503 op zijn robots.txt en de
        ophaling werd terecht geweigerd. Een verificatie die dan
        'onbevestigd' zegt, zegt iets over de dag en niet over het feit;
     3. de uitslag moet reproduceerbaar zijn. Twee keer dezelfde claim
        verifiëren hoort twee keer hetzelfde op te leveren.

   Wat deze laag dus zegt is scherper dan 'het besluit bestaat': hij zegt
   'het besluit is TERUGGEVONDEN in onze eigen verzameling, bij een bron
   die het gezag ervan is'. Is het er niet, dan is de uitslag NIET
   TERUGGEVONDEN — en dat is geen bewering dat het besluit niet bestaat.
   Dat onderscheid staat in de uitslag en niet in een voetnoot.

   ------------------------------------------------------------
   DE OVEREENKOMST IS EEN GETAL MET EEN EENHEID, NIET EEN WOORD

   Twee documenten over 'de nettarieven' zeggen niets; twee documenten
   die beide '20%' noemen in dezelfde eenheid wel. De koppeling loopt
   daarom over `waarde_numeriek` en `eenheid` van de claim, en zoekt een
   claim met dezelfde waarde en eenheid onder een document van het
   bevoegde gezag.

   Dat is streng, en dat moet: een losse woordovereenkomst zou precies
   het soort bevestiging opleveren dat R3 juist probeert te verwijderen.
   ============================================================ */

import type pg from "pg";
import { maakLogger } from "../kern/log.ts";
import { BRONNEN } from "../bronnen/register.ts";
import { gezagVan } from "./documentsoort.ts";

const log = maakLogger("bronverificatie");

/**
 * Welke bronsleutels vormen het gezag met deze naam.
 *
 * Dit is de omgekeerde kaart van EIGEN_GEZAG_NAMEN in documentsoort.ts.
 * Hij staat hier en niet daar omdat alleen deze laag hem nodig heeft, en
 * omdat hij het bronregister leest — documentsoort.ts blijft puur.
 */
const BRONNEN_VAN_GEZAG: Readonly<Record<string, readonly string[]>> = {
  ACM: ["acm-besluiten"],
  "de minister": ["rijksoverheid-nieuws", "koop-staatscourant-energie"],
  "het kabinet": ["rijksoverheid-nieuws"],
  "de Tweede Kamer": ["rijksoverheid-nieuws"],
  RVO: ["rvo-opendata-artikelen", "rvo-subsidie-sitemap"],
  TenneT: ["tennet-publicaties"],
  "de Europese Commissie": [],
};

export type Verificatie =
  | {
      readonly uitslag: "TERUGGEVONDEN";
      /** De claim bij het bevoegde gezag die dezelfde waarde draagt. */
      readonly bijUitspraakId: number;
      readonly bijBron: string;
      readonly bijDocument: string;
      readonly toelichting: string;
    }
  | {
      readonly uitslag: "NIET_TERUGGEVONDEN";
      readonly toelichting: string;
    }
  | {
      readonly uitslag: "NIET_VAN_TOEPASSING";
      readonly toelichting: string;
    };

/** Bestaat er een bron in het register die dit gezag vormt, en welke. */
export function bronnenVanGezag(gezagNaam: string): readonly string[] {
  const kandidaten = BRONNEN_VAN_GEZAG[gezagNaam] ?? [];
  /* Alleen bronnen die ook werkelijk in het register staan EN bevoegd
     gezag zijn. Zonder die tweede eis zou een verkeerd ingevulde kaart
     een willekeurige bron tot gezag maken. */
  return kandidaten.filter((sleutel) => {
    const b = BRONNEN.find((x) => x.sleutel === sleutel);
    return b !== undefined && gezagVan(b.uitgeverSoort) === "BEVOEGD_GEZAG";
  });
}

/**
 * Zoekt het origineel van één claim bij het gezag dat het besluit nam.
 *
 * @param beschrijftBesluitVan  uit de documentsoort van de bronversie
 * @param waarde  `waarde_numeriek` van de claim; zonder getal is er
 *        niets hard te vergelijken en is de uitslag NIET_VAN_TOEPASSING
 */
export async function verifieerBijGezag(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  claim: {
    readonly uitspraakId: number;
    readonly beschrijftBesluitVan: string | null;
    readonly waarde: number | null;
    readonly eenheid: string | null;
  },
): Promise<Verificatie> {
  if (claim.beschrijftBesluitVan === null) {
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting: "dit document vertelt geen besluit van een ander gezag na",
    };
  }
  if (claim.waarde === null || claim.eenheid === null) {
    return {
      uitslag: "NIET_VAN_TOEPASSING",
      toelichting:
        "de claim draagt geen getal met eenheid; een woordovereenkomst is geen verificatie",
    };
  }

  const bronnen = bronnenVanGezag(claim.beschrijftBesluitVan);
  if (bronnen.length === 0) {
    return {
      uitslag: "NIET_TERUGGEVONDEN",
      toelichting:
        `er is geen bron in het register die '${claim.beschrijftBesluitVan}' vormt, ` +
        "dus het origineel kan hier niet gezien zijn — dat is iets anders dan dat het niet bestaat",
    };
  }

  const { rows } = await c.query<{
    id: number;
    bron: string;
    titel: string;
  }>(
    `select u.id, b.sleutel as bron, bd.titel
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
       join intel.brondocument_versies bv on bv.id = ub.versie_id
       join intel.brondocumenten bd on bd.id = bv.brondocument_id
       join intel.bronnen b on b.id = bd.bron_id
      where u.organisatie_id = $1
        and b.sleutel = any($2)
        and u.waarde_numeriek = $3
        and u.eenheid = $4
        and u.id <> $5
      order by u.id
      limit 1`,
    [organisatieId, bronnen, claim.waarde, claim.eenheid, claim.uitspraakId],
  );

  const treffer = rows[0];
  if (!treffer) {
    return {
      uitslag: "NIET_TERUGGEVONDEN",
      toelichting:
        `geen claim met ${claim.waarde} ${claim.eenheid} gevonden onder ` +
        `${bronnen.join(", ")}; het origineel is niet in onze verzameling`,
    };
  }

  return {
    uitslag: "TERUGGEVONDEN",
    bijUitspraakId: treffer.id,
    bijBron: treffer.bron,
    bijDocument: treffer.titel,
    toelichting:
      `dezelfde waarde ${claim.waarde} ${claim.eenheid} staat in '${treffer.titel}' ` +
      `van ${treffer.bron}, en dat is het gezag dat dit besluit nam`,
  };
}

export type VerificatieRonde = {
  readonly bekeken: number;
  readonly teruggevonden: number;
  readonly nietTeruggevonden: number;
  readonly nietVanToepassing: number;
};

/**
 * Loopt de claims langs die een besluit van een ander gezag navertellen
 * en zet `primaire_bron_bevestigd` waar het origineel is teruggevonden.
 *
 * ZET GEEN `verificatie_status`. Dat is bewust: of een claim bevestigd
 * mag worden is de beslissing van schrijfUitspraken() op het moment dat
 * de claim ontstaat, en die beslissing stil van buitenaf overschrijven
 * zou de herkomst van de status onnavolgbaar maken. Deze laag levert een
 * FEIT (het origineel is gezien) dat de selectie en de redactie kunnen
 * gebruiken; de status zelf blijft waar hij hoort.
 */
export async function verifieerNavertellingen(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
  opties: { readonly max?: number } = {},
): Promise<VerificatieRonde> {
  const max = opties.max ?? 500;

  const { rows } = await c.query<{
    id: number;
    waarde: string | null;
    eenheid: string | null;
    besluit_van: string | null;
  }>(
    `select u.id, u.waarde_numeriek::text as waarde, u.eenheid,
            bv.beschrijft_besluit_van as besluit_van
       from intel.uitspraken u
       join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
       join intel.brondocument_versies bv on bv.id = ub.versie_id
      where u.organisatie_id = $1
        and bv.documentsoort = 'SECUNDAIRE_BERICHTGEVING'
        and bv.beschrijft_besluit_van is not null
        and not u.primaire_bron_bevestigd
      order by u.id
      limit $2`,
    [organisatieId, max],
  );

  let teruggevonden = 0;
  let nietTeruggevonden = 0;
  let nietVanToepassing = 0;

  for (const r of rows) {
    const v = await verifieerBijGezag(c, organisatieId, {
      uitspraakId: r.id,
      beschrijftBesluitVan: r.besluit_van,
      waarde: r.waarde === null ? null : Number(r.waarde),
      eenheid: r.eenheid,
    });
    if (v.uitslag === "TERUGGEVONDEN") {
      await c.query(
        "update intel.uitspraken set primaire_bron_bevestigd = true where id = $1 and organisatie_id = $2",
        [r.id, organisatieId],
      );
      teruggevonden += 1;
    } else if (v.uitslag === "NIET_TERUGGEVONDEN") {
      nietTeruggevonden += 1;
    } else {
      nietVanToepassing += 1;
    }
  }

  log.info("bronverificatie gereed", {
    bekeken: rows.length,
    teruggevonden,
    niet_teruggevonden: nietTeruggevonden,
    niet_van_toepassing: nietVanToepassing,
  });

  return {
    bekeken: rows.length,
    teruggevonden,
    nietTeruggevonden,
    nietVanToepassing,
  };
}
