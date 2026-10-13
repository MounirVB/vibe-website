/* ============================================================
   SEMANTIEK OPSLAAN EN BIJVULLEN
   ------------------------------------------------------------
   Twee wegen naar dezelfde velden:

     1. NIEUWE uitspraken krijgen hun semantiek bij het schrijven.
     2. BESTAANDE uitspraken worden bijgevuld uit hun eigen bronzin,
        die al in `intel.uitspraken.tekst` staat.

   Dat tweede is de reden dat een backfill hier mogelijk is zonder iets
   te verzinnen: de bronzin is bewaard, dus de semantiek is te meten in
   plaats van te raden. Lukt dat niet, dan blijft de uitspraak leeg en
   dat is de uitkomst.

   WAT DE BACKFILL NOOIT DOET

   - een verificatiestatus verhogen
   - een bestaande waarde overschrijven met een andere waarde
   - een mensbesluit aanraken
   - een veld vullen dat niet uit de bronzin volgt

   Hij is idempotent (dezelfde invoer geeft dezelfde uitkomst),
   hervatbaar (werkt per batch op id-orde) en navraagbaar (schrijft
   `semantiek_herkomst` en een auditregel per ronde).
   ============================================================ */

import type pg from "pg";
import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { leesUitdrukkingen, type Uitdrukking } from "./uitdrukking.ts";
import {
  leidSemantiekAf,
  verwoordbaarheidspoort,
  type Semantiek,
  type Verwoordbaarheid,
} from "./semantiek.ts";
import { verwoord } from "./verwoord.ts";

const log = maakLogger("semantiek");

/** Hoe lang een soort uitspraak houdbaar is, in dagen. */
export const HOUDBAARHEID_DAGEN: Readonly<Record<string, number>> = {
  /* Tarieven worden per jaar vastgesteld; ouder dan een jaarcyclus is
     niet meer de stand van zaken. */
  bedrag: 400,
  percentage: 400,
  /* Een netcapaciteit verschuift per kwartaal. */
  netcapaciteit: 120,
  /* Een technische specificatie verandert niet van jaar tot jaar. */
  vermogen: 1100,
  energie: 1100,
  termijn: 400,
  kwalitatief: 700,
};

export type SemantiekRij = {
  id: number;
  gebeurtenis_id: number;
  tekst: string | null;
  soort: string;
  waarde_numeriek: string | null;
  eenheid: string | null;
  onderwerp: string | null;
  verificatie_status: string;
  bewijs_kwaliteit: number;
  semantiek_soort: string | null;
  heeft_bewijs: boolean;
  mag_citeren: boolean;
  dagen_oud: number | null;
  uitgever: string | null;
  brondatum: string | null;
  vervangen_door: number | null;
  vervangen_soort: string | null;
};

export type Verrijking = {
  readonly id: number;
  readonly semantiek: Semantiek;
  readonly uitdrukking: Uitdrukking;
  readonly uitslag: Verwoordbaarheid;
  readonly reden: string;
  readonly zin: string | null;
};

/**
 * Leidt de semantiek van één uitspraakrij af en laat de poort erop los.
 *
 * Geeft null terug als er geen getaluitdrukking in de bronzin te vinden
 * is; dan valt er niets te verrijken en blijft de rij zoals hij was.
 */
export function verrijk(rij: SemantiekRij): Verrijking | null {
  if (!rij.tekst) return null;

  /* DE UITDRUKKING MOET BIJ DE BEWAARDE WAARDE PASSEN.
     Een bronzin kan meer getallen bevatten dan deze uitspraak; we
     zoeken de uitdrukking waarvan de waarde overeenkomt. Vinden we die
     niet, dan is de koppeling niet vast te stellen en verzinnen we er
     geen. */
  const kandidaten = leesUitdrukkingen(rij.tekst);
  if (kandidaten.length === 0) return null;

  const bewaard = rij.waarde_numeriek === null ? null : Number(rij.waarde_numeriek);
  let u: Uitdrukking | undefined;
  let schaalverlies: { bewaard: number; bron: Uitdrukking } | null = null;

  if (bewaard === null) {
    u = kandidaten[0];
  } else {
    /* EXACT, OF NIETS.
       ----------------------------------------------------------------
       De eerste versie had hier een tweede poging: als geen kandidaat
       exact matchte, werd er gezocht naar een kandidaat die ná deling
       door zijn schaalfactor wél matchte. Dat leek slim — zo vond hij de
       rijen die door het oude schaalverlies verkeerd stonden — en het
       was fout.

       Gevolg, gemeten: uitspraak 9 had waarde 235 en bronzin
       'EUR 235 miljoen'. De fallback koos de kandidaat met waarde
       235.000.000, de poort toetste DIE waarde (die rijmt) en de
       verwoorder gebruikte de BEWAARDE waarde 235. Uitkomst:
       "investeert de overheid EUR 235 in het net" waar de bron
       235 miljoen zegt. Precies de fout die deze release moet
       uitbannen, nu geproduceerd door de reparatie zelf.

       Dus: een divergentie is geen match maar een VONDST. De uitspraak
       wordt niet verwoordbaar en het verschil wordt gemeld. */
    u = kandidaten.find((k) => Math.abs(k.waarde - bewaard) < 1e-9);
    if (!u) {
      const viaSchaal = kandidaten.find(
        (k) => k.schaalwoord !== null && Math.abs(k.waarde / factorVan(k.schaalwoord) - bewaard) < 1e-9,
      );
      if (viaSchaal) schaalverlies = { bewaard, bron: viaSchaal };
    }
  }

  /* SCHAALVERLIES GEVONDEN: niet verwoorden, wel vastleggen. */
  if (schaalverlies) {
    const bron = schaalverlies.bron;
    return {
      id: rij.id,
      semantiek: leidSemantiekAf(rij.tekst, bron),
      /* De uitdrukking van de BRON bewaren, met de bewaarde waarde
         ernaast: zo is het verschil in de database te zien. */
      uitdrukking: { ...bron, waarde: schaalverlies.bewaard },
      uitslag: "VERIFICATIE_NODIG",
      reden:
        `de bewaarde waarde ${schaalverlies.bewaard} wijkt een factor ` +
        `${factorVan(bron.schaalwoord!)} af van de bronuitdrukking '${bron.uitdrukking}'. ` +
        `Het schaalwoord '${bron.schaalwoord}' is bij de extractie verdwenen. De waarde wordt ` +
        `NIET aangepast — dat is een correctie en hoort via intel.uitspraak_correcties te gaan — ` +
        `maar deze uitspraak is tot die tijd niet verwoordbaar.`,
      zin: null,
    };
  }

  if (!u) return null;

  const semantiek = leidSemantiekAf(rij.tekst, u);
  const houdbaarheid = HOUDBAARHEID_DAGEN[semantiek.soort] ?? null;
  const invoer = {
    semantiek,
    uitdrukking: u,
    uitgever: rij.uitgever,
    brondatum: rij.brondatum,
    bronzin: rij.tekst,
  };

  const poort = verwoordbaarheidspoort({
    semantiek,
    uitdrukking: u,
    verificatieStatus: rij.verificatie_status,
    bewijsKwaliteit: rij.bewijs_kwaliteit,
    heeftBewijs: rij.heeft_bewijs,
    vervangenDoor:
      rij.vervangen_door !== null
        ? { id: rij.vervangen_door, soort: rij.vervangen_soort ?? "onbekend" }
        : null,
    dagenOud: rij.dagen_oud,
    houdbaarheidDagen: houdbaarheid,
    magCiteren: rij.mag_citeren,
    kanVerwoorden: () => verwoord(invoer) !== null,
  });

  return {
    id: rij.id,
    semantiek,
    uitdrukking: u,
    uitslag: poort.uitslag,
    reden: poort.reden,
    zin: poort.uitslag === "VERWOORDBAAR" ? verwoord(invoer) : null,
  };
}

function factorVan(schaalwoord: string): number {
  const t: Record<string, number> = {
    duizend: 1e3,
    mille: 1e3,
    miljoen: 1e6,
    mln: 1e6,
    miljard: 1e9,
    mld: 1e9,
    biljoen: 1e12,
  };
  return t[schaalwoord] ?? 1;
}

/** De query die alles ophaalt wat de verrijking nodig heeft. */
const LEESQUERY = `
  select u.id, u.gebeurtenis_id, u.tekst, u.soort, u.waarde_numeriek, u.eenheid,
         u.onderwerp, u.verificatie_status, u.bewijs_kwaliteit, u.semantiek_soort,
         exists (select 1 from intel.uitspraak_bronnen ub
                  where ub.uitspraak_id = u.id and ub.rol = 'primair') as heeft_bewijs,
         coalesce(bool_and(b.mag_citeren), false) as mag_citeren,
         min(extract(day from (now() - d.gepubliceerd_op)))::int as dagen_oud,
         min(d.uitgever) as uitgever,
         min(d.gepubliceerd_op)::date::text as brondatum,
         (select c.vervanger_id from intel.uitspraak_correcties c
           where c.vervangen_id = u.id order by c.vastgesteld_op desc limit 1) as vervangen_door,
         (select c.soort from intel.uitspraak_correcties c
           where c.vervangen_id = u.id order by c.vastgesteld_op desc limit 1) as vervangen_soort
    from intel.uitspraken u
    left join intel.uitspraak_bronnen ub2 on ub2.uitspraak_id = u.id
    left join intel.brondocument_versies v on v.id = ub2.versie_id
    left join intel.brondocumenten d on d.id = v.brondocument_id
    left join intel.bronnen b on b.id = d.bron_id
   where u.organisatie_id = $1
     and u.id > $2
     %FILTER%
   group by u.id
   order by u.id
   limit $3`;

export type BackfillRapport = {
  readonly bekeken: number;
  readonly verrijkt: number;
  readonly onveranderd: number;
  readonly zonderUitdrukking: number;
  readonly perUitslag: Readonly<Record<string, number>>;
  readonly laatsteId: number;
};

/**
 * Vult de semantiek bij voor bestaande uitspraken.
 *
 * `vanafId` maakt hem hervatbaar; `alles` doet ook de rijen die al een
 * semantiek_soort hebben, nodig na een wijziging in het vocabulaire.
 */
export async function backfillSemantiek(
  pool: Pool,
  organisatieId: number,
  opties: { vanafId?: number; max?: number; alles?: boolean; droog?: boolean } = {},
): Promise<BackfillRapport> {
  const vanaf = opties.vanafId ?? 0;
  const max = opties.max ?? 500;
  /* WAT 'NOG NIET GEDAAN' BETEKENT.
     De eerste versie zocht alleen op `semantiek_soort is null`: nog geen
     semantiek afgeleid. Een uitspraak die WEL semantiek heeft maar nog
     geen verwoordbaarheidsoordeel viel daarmee buiten de backfill, en
     dat is precies de uitspraak die uit de schaalcorrectie komt: de
     semantiek is overgenomen, het oordeel is bewust leeggelaten omdat
     de waarde veranderde. Zonder deze tweede voorwaarde kreeg zo'n
     gecorrigeerde uitspraak nooit een zin en bleef de reparatie zonder
     effect. Niet af is: geen semantiek OF geen oordeel. */
  const filter = opties.alles ? "" : "and (u.semantiek_soort is null or u.verwoordbaar is null)";

  const rijenUit = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<SemantiekRij>(c, LEESQUERY.replace("%FILTER%", filter), [organisatieId, vanaf, max]),
  );

  const perUitslag: Record<string, number> = {};
  let verrijkt = 0;
  let onveranderd = 0;
  let zonderUitdrukking = 0;
  let laatsteId = vanaf;

  for (const rij of rijenUit) {
    laatsteId = rij.id;
    const v = verrijk(rij);
    if (!v) {
      zonderUitdrukking += 1;
      continue;
    }
    perUitslag[v.uitslag] = (perUitslag[v.uitslag] ?? 0) + 1;

    if (opties.droog) {
      verrijkt += 1;
      continue;
    }

    try {
      await metOrganisatie(pool, { organisatieId }, (c) => schrijfSemantiek(c, organisatieId, v));
      verrijkt += 1;
    } catch (e) {
      log.fout("semantiek wegschrijven mislukt", { uitspraak: rij.id, fout: e });
      onveranderd += 1;
    }
  }

  return {
    bekeken: rijenUit.length,
    verrijkt,
    onveranderd,
    zonderUitdrukking,
    perUitslag,
    laatsteId,
  };
}

/**
 * Schrijft de semantiek weg.
 *
 * RAAKT DE WAARDE NIET AAN. `waarde_numeriek` blijft staan zoals hij is,
 * ook als de uitdrukking een andere waarde suggereert. Een backfill die
 * waarden herschrijft zou een correctie zijn, en die hoort via
 * intel.uitspraak_correcties te gaan zodat de geschiedenis blijft staan.
 * Wat de backfill WEL doet is de poort laten zien dat er iets niet
 * rijmt: dan komt er VERIFICATIE_NODIG uit.
 */
export async function schrijfSemantiek(
  c: pg.PoolClient,
  organisatieId: number,
  v: Verrijking,
): Promise<void> {
  await c.query(
    `update intel.uitspraken
        set semantiek_soort     = $3,
            fenomeen            = $4,
            subject             = $5,
            richting            = $6,
            grondtal            = $7,
            uitdrukking         = $8,
            exactheid           = $9,
            bereik_min          = $10,
            bereik_max          = $11,
            schaalwoord         = $12,
            periode             = $13,
            horizon             = $20,
            bron_vindplaats     = $14,
            verwoorde_zin       = $18,
            scope_waarschuwing  = $19,
            verwoordbaar        = $15,
            verwoordbaar_reden  = $16,
            verwoordbaar_op     = now(),
            semantiek_herkomst  = $17,
            semantiek_op        = now()
      where organisatie_id = $1 and id = $2`,
    [
      organisatieId,
      v.id,
      v.semantiek.soort,
      v.semantiek.fenomeen,
      v.semantiek.subject,
      v.semantiek.richting,
      v.semantiek.grondtal,
      v.uitdrukking.uitdrukking,
      v.uitdrukking.exactheid,
      v.uitdrukking.bereikMin,
      v.uitdrukking.bereikMax,
      v.uitdrukking.schaalwoord,
      v.semantiek.periode,
      `tekenpositie ${v.uitdrukking.positie}`,
      v.uitslag,
      v.reden.slice(0, 2000),
      v.semantiek.herkomst,
      v.zin,
      v.semantiek.scopeWaarschuwing,
      v.semantiek.horizon,
    ],
  );
}

/* ------------------------------------------------------------------
   TEGENSPRAAK EN OPVOLGING
   ------------------------------------------------------------------ */

export type CorrectieRapport = {
  readonly bekeken: number;
  readonly vastgelegd: number;
  readonly perSoort: Readonly<Record<string, number>>;
};

/**
 * Zoekt uitspraken die door een nieuwere zijn vervangen.
 *
 * DE REGEL: zelfde fenomeen, zelfde subject, zelfde eenheid, en een
 * nieuwere bron. Dan beschrijft de nieuwere de stand van zaken en is de
 * oudere achterhaald.
 *
 * NIETS WORDT OVERSCHREVEN. De oudere rij blijft staan; er komt een
 * regel in intel.uitspraak_correcties bij. Par. 9 en 19 vragen dat
 * expliciet, en het is ook de enige manier om later te kunnen zien wat
 * er wanneer gold.
 */
export async function vindCorrecties(
  pool: Pool,
  organisatieId: number,
  opties: { droog?: boolean } = {},
): Promise<CorrectieRapport> {
  const paren = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      oud_id: number;
      nieuw_id: number;
      fenomeen: string;
      oud_waarde: string | null;
      nieuw_waarde: string | null;
      oud_datum: string | null;
      nieuw_datum: string | null;
      dagen: number | null;
    }>(
      c,
      `with met_datum as (
         select u.id, u.fenomeen, u.subject, u.eenheid, u.waarde_numeriek,
                min(d.gepubliceerd_op) as brondatum
           from intel.uitspraken u
           join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
           join intel.brondocument_versies v on v.id = ub.versie_id
           join intel.brondocumenten d on d.id = v.brondocument_id
          where u.organisatie_id = $1
            and u.fenomeen is not null
            and u.verificatie_status = 'bevestigd'
          group by u.id, u.fenomeen, u.subject, u.eenheid, u.waarde_numeriek)
       select o.id as oud_id, n.id as nieuw_id, o.fenomeen,
              o.waarde_numeriek::text as oud_waarde, n.waarde_numeriek::text as nieuw_waarde,
              o.brondatum::date::text as oud_datum, n.brondatum::date::text as nieuw_datum,
              extract(day from (n.brondatum - o.brondatum))::int as dagen
         from met_datum o
         join met_datum n
           on n.fenomeen = o.fenomeen
          and coalesce(n.subject,'') = coalesce(o.subject,'')
          and coalesce(n.eenheid,'') = coalesce(o.eenheid,'')
          and n.brondatum > o.brondatum
          and n.id <> o.id
        -- Alleen de EERSTVOLGENDE nieuwere; anders ketent elke oudere
        -- aan elke nieuwere en krijg je een kruisproduct.
        where not exists (
          select 1 from met_datum tussen
           where tussen.fenomeen = o.fenomeen
             and coalesce(tussen.subject,'') = coalesce(o.subject,'')
             and coalesce(tussen.eenheid,'') = coalesce(o.eenheid,'')
             and tussen.brondatum > o.brondatum
             and tussen.brondatum < n.brondatum)
          and not exists (
            select 1 from intel.uitspraak_correcties c
             where c.vervangen_id = o.id and c.vervanger_id = n.id)
        order by o.id`,
      [organisatieId],
    ),
  );

  const perSoort: Record<string, number> = {};
  let vastgelegd = 0;

  for (const p of paren) {
    /* Dezelfde waarde is geen correctie maar een herhaling. */
    if (p.oud_waarde !== null && p.oud_waarde === p.nieuw_waarde) continue;

    const soort = p.fenomeen === "nettarief" || p.fenomeen === "subsidiebudget"
      ? "statistiek_herzien"
      : "statistiek_herzien";
    perSoort[soort] = (perSoort[soort] ?? 0) + 1;
    if (opties.droog) {
      vastgelegd += 1;
      continue;
    }
    await metOrganisatie(pool, { organisatieId }, (c) =>
      c.query(
        `insert into intel.uitspraak_correcties
           (organisatie_id, vervangen_id, vervanger_id, soort, grondslag)
         values ($1,$2,$3,$4,$5)
         on conflict (vervangen_id, vervanger_id) do nothing`,
        [
          organisatieId,
          p.oud_id,
          p.nieuw_id,
          soort,
          `zelfde fenomeen '${p.fenomeen}' met dezelfde eenheid, maar uitspraak ${p.nieuw_id} ` +
            `komt uit een bron van ${p.nieuw_datum} en uitspraak ${p.oud_id} uit ${p.oud_datum} ` +
            `(${p.dagen} dagen eerder). De waarde ging van ${p.oud_waarde} naar ${p.nieuw_waarde}. ` +
            `De nieuwere beschrijft de stand van zaken; de oudere blijft staan als geschiedenis.`,
        ],
      ),
    );
    vastgelegd += 1;
  }

  return { bekeken: paren.length, vastgelegd, perSoort };
}
