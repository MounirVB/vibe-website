/* ============================================================
   ANALYTICS — GEO: zichtbaarheid in AI-antwoorden
   ------------------------------------------------------------
   WAT DIT IS, EN WAT HET BESLIST NIET IS.

   Dit meet: noemt DIT model, op DEZE datum, met DEZE prompt, in deze
   taal, zonder gespreksgeschiedenis, Vibe Energy — en citeert het een
   van onze pagina's.

   Dit meet NIET: hoe vaak AI-assistenten ons noemen tegen echte
   gebruikers. Dat is een ander ding, en het verschil is niet academisch:

     * een echte gebruiker heeft een gespreksgeschiedenis, een locatie en
       een eigen formulering;
     * de meeste aanbieders personaliseren en A/B-testen;
     * een modelversie verandert zonder aankondiging, en een antwoord is
       niet deterministisch;
     * wij meten één provider, op het moment dat wij meten.

   Elke uitkomst van deze module draagt dat voorbehoud mee, en de
   databasekolommen heten ernaar. Zie de kop van migratie 0049.

   ------------------------------------------------------------
   EEN ONTBREKENDE METING IS GEEN SLECHTE ZICHTBAARHEID

   Dezelfde fout die intel.analytics_dekking voor Search Console
   voorkomt. Elke POGING krijgt een rij, ook een mislukte, met uitkomst
   'niet_gemeten' en de reden erbij. En
   intel.geo_zichtbaarheid_per_prompt levert `aandeel_met_merk` als NULL
   zodra er nul gemeten pogingen zijn: 0 van 0 is geen nul procent, het
   is geen getal.

   ------------------------------------------------------------
   GEEN NIEUWE BETAALDE DIENST

   Deze module gebruikt de BESTAANDE modellaag (inhoud/model.ts) met zijn
   allowlist, stroomonderbreker, dagbudget en boekhouding. Hij zet geen
   eigen sleutel, kent geen eigen provider en omzeilt geen grendel.

   GEMETEN OP 1 NOVEMBER 2026: er is op geen enkele service een
   modelsleutel gezet (0 treffers op OPENAI/ANTHROPIC/GEMINI over
   vibe-intel-api, -worker en -planner). kiesProvider() valt dan terug op
   de DETERMINISTISCHE provider, en die kan per definitie geen
   zichtbaarheid meten — hij heeft geen kennis van de wereld. Deze module
   weigert daarom expliciet op die provider, met reden, in plaats van
   zijn uitvoer als meting te boeken. Dat is het verschil tussen 'niet
   gemeten' en 'niet zichtbaar'.
   ============================================================ */

import type pg from "pg";
import { metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import {
  boekAanroep,
  controleerBudget,
  kiesProvider,
  type ModelAntwoord,
} from "../inhoud/model.ts";

const log = maakLogger("geo");

/**
 * De versie van de MEETMETHODE, niet van het model.
 *
 * Verhoog dit zodra de detectie verandert: andere merktermen, een ander
 * domein, een andere manier van citaten tellen. Twee reeksen met
 * verschillende methodeversies zijn niet vergelijkbaar, en dat moet uit
 * de DATA blijken en niet uit een aanname van wie het dashboard leest.
 */
/* HET MAXIMUM AAN UITVOERTOKENS, als constante omdat hij op twee
   plekken moet gelden: in de kostenschatting VOORAF en in de aanroep
   zelf. Twee losse getallen zouden uiteen kunnen lopen, en dan schat de
   budgetcontrole iets anders in dan er wordt uitgegeven. */
export const GEO_MAX_TOKENS_UIT = 900;

export const GEO_METHODE_VERSIE = "geo-v1";

/** Het eigen domein, waarvan een citaat als eigen pagina telt. */
export const EIGEN_DOMEIN = "vibeenergy.nl";

/**
 * De merktermen die als vermelding tellen.
 *
 * 'Vibe' alleen staat er NIET in, en dat is met opzet: dat woord komt in
 * willekeurige tekst voor en zou een vermelding verzinnen. Een merknaam
 * moet eenduidig naar ons verwijzen.
 */
export const MERKTERMEN: readonly string[] = ["vibe energy", "vibeenergy", "vibe-energy"];

export type GeoPrompt = {
  readonly sleutel: string;
  readonly onderwerp: string;
  readonly prompt: string;
};

/**
 * De promptset: acht zakelijke energievraagstukken.
 *
 * DE VORM IS BEWUST EEN VRAAG DIE EEN BEDRIJF ZOU STELLEN, niet een
 * zoekterm. Een AI-assistent krijgt vragen, geen keywords, en een meting
 * op 'zakelijke batterijopslag' zou iets anders meten dan wat een
 * inkoper werkelijk intypt.

 * GEEN MERKNAAM IN DE PROMPT. Dat is de belangrijkste regel van deze
 * set: wie 'Vibe Energy' in de vraag zet, meet of het model kan
 * herhalen, niet of het ons kent. Elke prompt hieronder is daarom
 * merkloos en zou door elke aanbieder in deze markt beantwoord kunnen
 * worden.
 *
 * DE SLEUTELS ZIJN STABIEL. Een herschreven vraag krijgt een nieuwe
 * VERSIE onder dezelfde sleutel, zodat de trendview blijft werken; zie
 * migratie 0049.
 */
export const GEO_PROMPTS: readonly GeoPrompt[] = [
  {
    sleutel: "bess-zakelijk",
    onderwerp: "bess",
    prompt:
      "Welke partijen in Nederland helpen bedrijven met het plaatsen van een batterij bij hun " +
      "bedrijfspand, en waar moet ik op letten bij de businesscase?",
  },
  {
    sleutel: "netcongestie-aansluiting",
    onderwerp: "netcongestie",
    prompt:
      "Mijn bedrijf staat in een congestiegebied en kan geen zwaardere netaansluiting krijgen. " +
      "Welke oplossingen zijn er en wie in Nederland kan daarbij helpen?",
  },
  {
    sleutel: "ems-energiemanagement",
    onderwerp: "ems",
    prompt:
      "Wat doet een energiemanagementsysteem voor een bedrijf met zonnepanelen en een batterij, " +
      "en welke aanbieders zijn er in Nederland?",
  },
  {
    sleutel: "energiehandel-flexibiliteit",
    onderwerp: "marktprijs",
    prompt:
      "Hoe kan een bedrijf geld verdienen met het aanbieden van flexibiliteit op de " +
      "energiemarkt, en welke Nederlandse partijen bieden dat aan?",
  },
  {
    sleutel: "laadinfra-zakelijk",
    onderwerp: "laadinfrastructuur",
    prompt:
      "Wij willen laadpalen voor ons bedrijfsterrein met een beperkte netaansluiting. Welke " +
      "aanpak is gangbaar en welke Nederlandse partijen leveren dat?",
  },
  {
    sleutel: "industriele-elektrificatie",
    onderwerp: "netbeheer",
    prompt:
      "Welke stappen zet een industrieel bedrijf in Nederland om van gas naar elektriciteit over " +
      "te gaan, en wie begeleidt zo'n traject?",
  },
  {
    sleutel: "zonnepanelen-bedrijven",
    onderwerp: "zonne-energie",
    prompt:
      "Waar moet een bedrijf op letten bij zonnepanelen op een bedrijfsdak in Nederland, en " +
      "welke partijen doen dit zakelijk?",
  },
  {
    sleutel: "opslag-subsidies",
    onderwerp: "subsidie",
    prompt:
      "Welke Nederlandse subsidies of fiscale regelingen bestaan er in 2026 voor zakelijke " +
      "energieopslag, en wie kan helpen bij de aanvraag?",
  },
];

export type Detectie = {
  readonly merkVermeld: boolean;
  readonly eigenCitaten: readonly { readonly waarde: string; readonly positie: number }[];
  readonly andereBronnen: readonly { readonly waarde: string; readonly positie: number }[];
  readonly merkPositie: number | null;
};

/**
 * Zoekt in een antwoord naar ons merk, onze pagina's en andere bronnen.
 *
 * PUUR EN ZONDER DATABASE, zodat hij na te rekenen is en een toets hem
 * op vaste teksten kan vastzetten. De positie is de tekenindex, zodat
 * 'genoemd in de eerste regel' te onderscheiden is van 'genoemd in een
 * voetnoot' — en dat verschil is commercieel het halve verhaal.
 */
export function detecteer(antwoord: string): Detectie {
  const laag = antwoord.toLowerCase();

  let merkPositie: number | null = null;
  for (const term of MERKTERMEN) {
    const i = laag.indexOf(term);
    if (i !== -1 && (merkPositie === null || i < merkPositie)) merkPositie = i;
  }

  /* DOMEINEN UIT HET ANTWOORD. Een model noemt bronnen als URL of als
     kaal domein; beide vormen tellen. De regex is bewust ruim aan de
     linkerkant (met of zonder schema, met of zonder www) en streng aan
     de rechterkant: een domein eindigt op een bekende TLD-vorm. */
  const domeinen = new Map<string, number>();
  const patroon = /(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+)/gi;
  for (const m of laag.matchAll(patroon)) {
    const domein = m[1]!;
    /* Minstens één punt en een TLD van twee tekens of meer; dat sluit
       versienummers ('3.0') en afkortingen uit. */
    const delen = domein.split(".");
    const tld = delen[delen.length - 1]!;
    if (delen.length < 2 || tld.length < 2 || /^\d+$/.test(tld)) continue;
    if (!domeinen.has(domein)) domeinen.set(domein, m.index ?? 0);
  }

  const eigen: { waarde: string; positie: number }[] = [];
  const andere: { waarde: string; positie: number }[] = [];
  for (const [domein, positie] of domeinen) {
    if (domein === EIGEN_DOMEIN || domein.endsWith(`.${EIGEN_DOMEIN}`)) {
      eigen.push({ waarde: domein, positie });
    } else {
      andere.push({ waarde: domein, positie });
    }
  }

  return {
    merkVermeld: merkPositie !== null,
    merkPositie,
    eigenCitaten: eigen.sort((a, b) => a.positie - b.positie),
    andereBronnen: andere.sort((a, b) => a.positie - b.positie),
  };
}

export type GeoRondeUitkomst = {
  readonly provider: string;
  readonly model: string;
  readonly methodeVersie: string;
  readonly prompts: number;
  readonly gemeten: number;
  readonly nietGemeten: number;
  readonly overgeslagen: number;
  readonly metMerk: number;
  readonly metEigenCitaat: number;
  /**
   * Het aandeel over de GEMETEN pogingen, of null zodra er niets is
   * gemeten. Nooit 0 bij nul metingen; zie de kop.
   */
  readonly aandeelMetMerk: number | null;
  readonly redenNietGemeten: readonly string[];
  readonly droog: boolean;
};

/** Zaait de promptset als die nog niet bestaat. Idempotent per sleutel. */
export async function zaaiGeoPrompts(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
): Promise<{ readonly toegevoegd: number }> {
  let toegevoegd = 0;
  for (const p of GEO_PROMPTS) {
    const r = await c.query(
      `insert into intel.geo_prompts (organisatie_id, sleutel, versie, onderwerp, prompt)
       values ($1,$2,1,$3,$4)
       on conflict (organisatie_id, sleutel, versie) do nothing`,
      [organisatieId, p.sleutel, p.onderwerp, p.prompt],
    );
    toegevoegd += r.rowCount ?? 0;
  }
  return { toegevoegd };
}

/**
 * Eén gecontroleerde meetronde over de actieve promptset.
 *
 * DE GRENDELS, in deze orde, en elke grendel levert een RIJ met reden in
 * plaats van een ontbrekende meting:
 *
 *   1 geen bruikbare provider  -> alle prompts 'niet_gemeten'
 *   2 dagbudget op             -> resterende prompts 'niet_gemeten'
 *   3 een mislukte aanroep     -> die prompt 'niet_gemeten'
 *
 * Grendel 1 is de belangrijkste en hij is streng: valt kiesProvider()
 * terug op de deterministische provider, dan WEIGERT deze module. Die
 * provider heeft geen kennis van de wereld, dus zijn uitvoer zou een
 * verzonnen nulmeting zijn — precies wat de opdracht verbiedt.
 */
export async function geoRonde(
  pool: Pool,
  organisatieId: number,
  opties: { readonly droog?: boolean; readonly max?: number } = {},
): Promise<GeoRondeUitkomst> {
  const droog = opties.droog === true;
  const provider = kiesProvider();
  const beschikbaar = provider.beschikbaar();

  /* GRENDEL 1 — en let op WELKE twee dingen hier worden afgewezen. Een
     provider die zegt dat hij niet beschikbaar is, én de
     deterministische terugval, die zich wél beschikbaar noemt maar niets
     van de wereld weet. Zonder die tweede eis zou deze ronde vrolijk
     'nul vermeldingen' boeken op een lokale sjabloongenerator. */
  const onbruikbaar =
    !beschikbaar.ja || provider.naam === "deterministisch"
      ? provider.naam === "deterministisch"
        ? "er is geen modelsleutel gezet, dus kiesProvider() valt terug op de DETERMINISTISCHE " +
          "provider. Die heeft geen kennis van de wereld en kan zichtbaarheid niet meten; zijn " +
          "uitvoer als meting boeken zou een verzonnen nulmeting zijn."
        : beschikbaar.reden
      : null;

  const actief = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{ id: number; sleutel: string; versie: number; onderwerp: string; prompt: string }>(
      c,
      `select id, sleutel, versie, onderwerp, prompt
         from intel.geo_prompts
        where organisatie_id = $1 and actief
        order by onderwerp, sleutel
        limit $2`,
      [organisatieId, opties.max ?? 100],
    ),
  );

  const redenen = new Set<string>();
  let gemeten = 0;
  let nietGemeten = 0;
  let metMerk = 0;
  let metEigenCitaat = 0;

  for (const p of actief) {
    if (onbruikbaar !== null) {
      redenen.add(onbruikbaar);
      nietGemeten += 1;
      if (!droog) {
        await metOrganisatie(pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.geo_metingen
               (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
                methode_versie, uitkomst, reden)
             values ($1,$2,$3,$4,$5,$6,$7,'niet_gemeten',$8)`,
            [
              organisatieId,
              p.id,
              p.sleutel,
              p.versie,
              provider.naam,
              provider.model,
              GEO_METHODE_VERSIE,
              onbruikbaar,
            ],
          ),
        );
      }
      continue;
    }

    /* GRENDEL 2 — het dagbudget van de BESTAANDE kostenlaag. Geen eigen
       plafond: twee plafonds op dezelfde uitgaven lopen uiteen.

       PROVIDER EN MODEL GAAN MEE sinds migratie 0053. Zonder die twee
       toetst controleerBudget alleen het aanroepenplafond en blijven de
       GELDgrenzen buiten beschouwing — en een GEO-ronde is dezelfde
       AI-uitgave als een artikel, dus hij hoort onder dezelfde €5 per
       dag te vallen. Het maximum aan uitvoertokens is wat deze ronde
       daadwerkelijk vraagt, zodat de kostenschatting over de BOVENGRENS
       gaat en niet over een gemiddelde. */
    const budget = await metOrganisatie(pool, { organisatieId }, (c) =>
      controleerBudget(c as pg.PoolClient, organisatieId, {
        provider: provider.naam,
        model: provider.model,
        maxTokensUit: GEO_MAX_TOKENS_UIT,
        tokensIn: Math.ceil(p.prompt.length / 4),
      }),
    );
    if (!budget.mag) {
      const reden = `dagbudget bereikt (${budget.gebruiktVandaag}/${budget.plafond}): ${budget.reden}`;
      redenen.add(reden);
      nietGemeten += 1;
      if (!droog) {
        await metOrganisatie(pool, { organisatieId }, (c) =>
          c.query(
            `insert into intel.geo_metingen
               (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
                methode_versie, uitkomst, reden)
             values ($1,$2,$3,$4,$5,$6,$7,'niet_gemeten',$8)`,
            [
              organisatieId,
              p.id,
              p.sleutel,
              p.versie,
              provider.naam,
              provider.model,
              GEO_METHODE_VERSIE,
              reden,
            ],
          ),
        );
      }
      continue;
    }

    if (droog) {
      /* DROOG DOET GEEN AANROEP. Een droge ronde die wel declareert zou
         kosten maken bij een opdracht die zegt dat hij niets doet. */
      continue;
    }

    let antwoord: ModelAntwoord | null = null;
    let fout: string | null = null;
    try {
      antwoord = await provider.genereer({
        doel: "geo_zichtbaarheid",
        systeem:
          "Je beantwoordt een zakelijke vraag over de Nederlandse energiemarkt. Noem concrete " +
          "partijen en bronnen waar dat kan. Antwoord in het Nederlands.",
        gebruiker: p.prompt,
        maxTokensUit: GEO_MAX_TOKENS_UIT,
      });
    } catch (e) {
      fout = e instanceof Error ? e.message : String(e);
    }

    await metOrganisatie(pool, { organisatieId }, async (c) => {
      /* DE AANROEP WORDT GEBOEKT IN DE BESTAANDE KOSTENLAAG, geslaagd of
         niet. Zonder die boeking zou een GEO-ronde buiten het dagbudget
         om kosten maken. */
      await boekAanroep(c as pg.PoolClient, organisatieId, {
        doel: "geo_zichtbaarheid",
        antwoord,
        provider: provider.naam,
        model: provider.model,
        promptHash: antwoord?.promptHash ?? "",
        geslaagd: antwoord !== null,
        foutSoort: fout === null ? null : "model",
      });

      if (antwoord === null) {
        const reden = `modelaanroep mislukt: ${fout ?? "onbekende fout"}`;
        redenen.add(reden);
        nietGemeten += 1;
        await c.query(
          `insert into intel.geo_metingen
             (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
              methode_versie, uitkomst, reden)
           values ($1,$2,$3,$4,$5,$6,$7,'niet_gemeten',$8)`,
          [
            organisatieId,
            p.id,
            p.sleutel,
            p.versie,
            provider.naam,
            provider.model,
            GEO_METHODE_VERSIE,
            reden,
          ],
        );
        return;
      }

      const d = detecteer(antwoord.tekst);
      gemeten += 1;
      if (d.merkVermeld) metMerk += 1;
      if (d.eigenCitaten.length > 0) metEigenCitaat += 1;

      const ins = await c.query<{ id: number }>(
        `insert into intel.geo_metingen
           (organisatie_id, prompt_id, prompt_sleutel, prompt_versie, provider, model,
            model_versie, methode_versie, uitkomst, antwoord, antwoord_lengte,
            merk_vermeld, eigen_citaten, bron_verwijzingen, tokens_in, tokens_uit)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'gemeten',$9,$10,$11,$12,$13,$14,$15)
         returning id`,
        [
          organisatieId,
          p.id,
          p.sleutel,
          p.versie,
          antwoord.provider,
          antwoord.model,
          /* DE MODELVERSIE ZOALS DE PROVIDER HEM TERUGGAF, niet zoals wij
             hem hebben gevraagd. Een aanbieder kan een alias naar een
             andere versie laten wijzen. */
          antwoord.model,
          GEO_METHODE_VERSIE,
          antwoord.tekst,
          antwoord.tekst.length,
          d.merkVermeld,
          d.eigenCitaten.length,
          d.andereBronnen.length,
          antwoord.tokensIn,
          antwoord.tokensUit,
        ],
      );
      const metingId = ins.rows[0]!.id;

      if (d.merkVermeld && d.merkPositie !== null) {
        await c.query(
          `insert into intel.geo_vermeldingen (organisatie_id, meting_id, soort, waarde, positie)
           values ($1,$2,'merk',$3,$4) on conflict do nothing`,
          [organisatieId, metingId, EIGEN_DOMEIN, d.merkPositie],
        );
      }
      for (const e of d.eigenCitaten) {
        await c.query(
          `insert into intel.geo_vermeldingen (organisatie_id, meting_id, soort, waarde, positie)
           values ($1,$2,'eigen_pagina',$3,$4) on conflict do nothing`,
          [organisatieId, metingId, e.waarde, e.positie],
        );
      }
      for (const a of d.andereBronnen) {
        await c.query(
          `insert into intel.geo_vermeldingen (organisatie_id, meting_id, soort, waarde, positie)
           values ($1,$2,'andere_bron',$3,$4) on conflict do nothing`,
          [organisatieId, metingId, a.waarde, a.positie],
        );
      }
    });
  }

  const uit: GeoRondeUitkomst = {
    provider: provider.naam,
    model: provider.model,
    methodeVersie: GEO_METHODE_VERSIE,
    prompts: actief.length,
    gemeten,
    nietGemeten,
    overgeslagen: droog ? actief.length - nietGemeten : 0,
    metMerk,
    metEigenCitaat,
    /* NULL BIJ NUL METINGEN. Dit is de hele reden dat dit veld nullable
       is: 0 van 0 is geen nul procent. */
    aandeelMetMerk: gemeten > 0 ? metMerk / gemeten : null,
    redenNietGemeten: [...redenen],
    droog,
  };
  log.info("geo-ronde gereed", { ...uit, redenNietGemeten: uit.redenNietGemeten.length });
  return uit;
}

export type GeoStand = {
  readonly prompts: number;
  readonly metingen: number;
  readonly gemeten: number;
  readonly nietGemeten: number;
  readonly laatsteMeting: string | null;
  readonly aandeelMetMerk: number | null;
  readonly methodeVersies: readonly string[];
};

/**
 * Wat er van GEO in de database staat. Voor het dashboard en de monitor.
 *
 * NEEMT EEN CLIENT EN GEEN POOL, om dezelfde reden als gscStand(): hij
 * leest alleen, en meetGezondheid() reikt een client aan.
 */
export async function geoStand(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
): Promise<GeoStand> {
  {
    const r = await rijen<{
      prompts: string;
      metingen: string;
      gemeten: string;
      niet_gemeten: string;
      laatste: string | null;
      met_merk: string;
      versies: string | null;
    }>(
      c,
      `select (select count(*) from intel.geo_prompts where organisatie_id = $1 and actief)::text as prompts,
              (select count(*) from intel.geo_metingen where organisatie_id = $1)::text           as metingen,
              (select count(*) from intel.geo_metingen
                where organisatie_id = $1 and uitkomst = 'gemeten')::text                         as gemeten,
              (select count(*) from intel.geo_metingen
                where organisatie_id = $1 and uitkomst = 'niet_gemeten')::text                    as niet_gemeten,
              (select max(gemeten_op)::text from intel.geo_metingen where organisatie_id = $1)    as laatste,
              (select count(*) from intel.geo_metingen
                where organisatie_id = $1 and uitkomst = 'gemeten' and merk_vermeld)::text        as met_merk,
              (select string_agg(distinct methode_versie, ',') from intel.geo_metingen
                where organisatie_id = $1)                                                        as versies`,
      [organisatieId],
    );
    const x = r[0];
    const gemeten = Number(x?.gemeten ?? 0);
    return {
      prompts: Number(x?.prompts ?? 0),
      metingen: Number(x?.metingen ?? 0),
      gemeten,
      nietGemeten: Number(x?.niet_gemeten ?? 0),
      laatsteMeting: x?.laatste ?? null,
      /* OPNIEUW NULL BIJ NUL. Het dashboard moet 'niet gemeten' kunnen
         tonen in plaats van 0%. */
      aandeelMetMerk: gemeten > 0 ? Number(x?.met_merk ?? 0) / gemeten : null,
      methodeVersies: (x?.versies ?? "").split(",").filter((s) => s !== ""),
    };
  }
}
