/* ============================================================
   OPS — AI-provider: validatie, allowlist, budget, onderbreker
   ------------------------------------------------------------
   Release 2.1 meldde `vertrouwd=false` voor het model: de sleutel was
   aanwezig maar nooit tegen de echte API gehouden. Dit bestand lost
   dat op, plus de drie kostengaten die migratie 0014 beschrijft.

   EEN AANWEZIGE SLEUTEL IS GEEN WERKENDE SLEUTEL
   `beschikbaar()` keek alleen of OPENAI_API_KEY bestond. Een
   verlopen, ingetrokken of verkeerd gekopieerde sleutel ziet er dan
   net zo uit als een goede, en dat merk je pas bij de eerste echte
   generatie — als een mislukte aanroep in de wachtrij.

   DE VALIDATIE KOST NIETS
   `GET /v1/models` is geen generatie: er komt geen token aan te pas
   en er staat niets op de rekening. De uitkomst zegt drie dingen die
   je wil weten vóór je gaat genereren: de sleutel is geldig (geen
   401), het account bestaat (geen 403), en het GEPINDE model staat in
   de lijst die dit account mag gebruiken.

   DE SLEUTEL WORDT NOOIT GELOGD
   Niet in het bewijs, niet in een foutmelding, niet bij debug. Wat
   wel wordt vastgelegd is de VORM: lengte, prefix en de laatste vier
   tekens. Daarmee is te zien óf er een andere sleutel is gezet zonder
   dat de sleutel zelf ergens staat.

   WAAROM DE ALLOWLIST IN DE DATABASE STAAT
   Een lijst in code zou met een deploy veranderen. Een nieuw model
   toestaan is een besluit met een datum en een reden, en dat hoort
   naast de prijsregel te staan — in intel.ai_toegestane_modellen.
   Een LEGE allowlist betekent: niets toegestaan. Dat is de veilige
   kant: wie het platform zonder configuratie opstart krijgt de
   deterministische terugval en geen rekening.
   ============================================================ */

import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { eenRij, rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("aibeheer");

/* ------------------------------------------------------------------
   1. De sleutel, zonder hem te onthullen
   ------------------------------------------------------------------ */

export type SleutelVorm = {
  readonly aanwezig: boolean;
  readonly lengte: number;
  readonly prefix: string;
  readonly staart: string;
  readonly vingerafdruk: string;
};

/**
 * Beschrijft de VORM van de sleutel, nooit de sleutel.
 *
 * De vingerafdruk is geen hash van de sleutel alleen: een hash van
 * een korte string is met een woordenlijst terug te rekenen. Hij
 * bestaat uit lengte plus prefix plus staart, en dat is genoeg om te
 * zien dat er een ANDERE sleutel staat zonder te verraden welke.
 */
export function sleutelVorm(sleutel: string | undefined): SleutelVorm {
  if (!sleutel) {
    return { aanwezig: false, lengte: 0, prefix: "", staart: "", vingerafdruk: "geen" };
  }
  const prefix = /^(sk-proj-|sk-svcacct-|sk-)/.exec(sleutel)?.[1] ?? "onbekend-";
  const staart = sleutel.slice(-4);
  return {
    aanwezig: true,
    lengte: sleutel.length,
    prefix,
    staart,
    vingerafdruk: `${prefix}…${staart} (${sleutel.length} tekens)`,
  };
}

/* ------------------------------------------------------------------
   2. Validatie tegen de echte API
   ------------------------------------------------------------------ */

export type ValidatieUitkomst = {
  readonly geldig: boolean;
  readonly httpStatus: number | null;
  readonly modelBeschikbaar: boolean | null;
  readonly aantalModellen: number | null;
  readonly bewijs: string;
  readonly duurMs: number;
};

/**
 * Valideert de sleutel met een NIET-declarabele aanroep.
 *
 * `GET /v1/models` kost niets. Vier uitkomsten die elk iets anders
 * betekenen:
 *
 *   200  sleutel werkt; de modellenlijst zegt of het gepinde model mag
 *   401  sleutel ongeldig, verlopen of ingetrokken
 *   403  sleutel geldig maar het account mag dit niet
 *   429  sleutel werkt maar staat op een limiet — NIET ongeldig
 *
 * Die laatste is belangrijk: een 429 als "ongeldig" behandelen zou
 * het platform op een deterministische terugval zetten terwijl er
 * niets mis is met de configuratie.
 */
export async function valideerOpenAi(opties: { timeoutMs?: number } = {}): Promise<ValidatieUitkomst> {
  const config = configLezen();
  const sleutel = process.env["OPENAI_API_KEY"];
  const vorm = sleutelVorm(sleutel);
  const begin = Date.now();

  if (!vorm.aanwezig) {
    return {
      geldig: false,
      httpStatus: null,
      modelBeschikbaar: null,
      aantalModellen: null,
      bewijs: "OPENAI_API_KEY ontbreekt in de omgeving",
      duurMs: 0,
    };
  }
  if (!config.netwerkToegestaan) {
    return {
      geldig: false,
      httpStatus: null,
      modelBeschikbaar: null,
      aantalModellen: null,
      bewijs: `netwerk uitgeschakeld (INTEL_NETWERK_TOEGESTAAN=0); sleutel ${vorm.vingerafdruk} NIET gevalideerd`,
      duurMs: 0,
    };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opties.timeoutMs ?? 15_000);
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${sleutel}`, "user-agent": config.userAgent },
      signal: ac.signal,
    });
    const duurMs = Date.now() - begin;

    if (r.status === 401) {
      return {
        geldig: false,
        httpStatus: 401,
        modelBeschikbaar: null,
        aantalModellen: null,
        bewijs: `HTTP 401: sleutel ${vorm.vingerafdruk} is ongeldig, verlopen of ingetrokken`,
        duurMs,
      };
    }
    if (r.status === 403) {
      return {
        geldig: false,
        httpStatus: 403,
        modelBeschikbaar: null,
        aantalModellen: null,
        bewijs: `HTTP 403: sleutel ${vorm.vingerafdruk} is geldig maar dit account mag de modellenlijst niet lezen`,
        duurMs,
      };
    }
    if (r.status === 429) {
      // Een limiet is geen ongeldige sleutel.
      return {
        geldig: true,
        httpStatus: 429,
        modelBeschikbaar: null,
        aantalModellen: null,
        bewijs: `HTTP 429: sleutel ${vorm.vingerafdruk} werkt maar staat op een snelheidslimiet`,
        duurMs,
      };
    }
    if (!r.ok) {
      return {
        geldig: false,
        httpStatus: r.status,
        modelBeschikbaar: null,
        aantalModellen: null,
        bewijs: `HTTP ${r.status} van de modellenlijst; niet te beoordelen`,
        duurMs,
      };
    }

    const body = (await r.json()) as { data?: { id?: string }[] };
    const ids = (body.data ?? []).map((m) => String(m.id ?? ""));
    /* Het gepinde model is 'gpt-5-2025-08-07'; de lijst kan de basisnaam
       'gpt-5' bevatten. Beide tellen als beschikbaar. */
    const basis = config.aiModel.replace(/-\d{4}-\d{2}-\d{2}$/, "");
    const beschikbaar = ids.includes(config.aiModel) || ids.includes(basis);

    return {
      geldig: true,
      httpStatus: 200,
      modelBeschikbaar: beschikbaar,
      aantalModellen: ids.length,
      bewijs:
        `HTTP 200, ${ids.length} modellen beschikbaar voor sleutel ${vorm.vingerafdruk}; ` +
        `'${config.aiModel}' ${beschikbaar ? "staat in de lijst" : `staat er NIET in (basis '${basis}' ook niet)`}`,
      duurMs,
    };
  } catch (e) {
    return {
      geldig: false,
      httpStatus: null,
      modelBeschikbaar: null,
      aantalModellen: null,
      bewijs: `validatie mislukte: ${e instanceof Error ? e.message : String(e)}`,
      duurMs: Date.now() - begin,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Zet de vertrouwensgrendel in intel.koppelingen.
 *
 * `vertrouwd` gaat alleen op true na een GESLAAGDE validatie, en het
 * bewijs gaat mee. Zo is later te zien waarop dat vertrouwen rust.
 */
export async function legValidatieVast(
  c: pg.PoolClient,
  organisatieId: number,
  uitkomst: ValidatieUitkomst,
): Promise<void> {
  await c.query(
    `update intel.koppelingen
        set vertrouwd       = $3,
            gevalideerd_op  = case when $3 then now() else gevalideerd_op end,
            validatie_bewijs = $4,
            laatste_check_op = now(),
            bijgewerkt_op   = now()
      where organisatie_id = $1 and sleutel = $2`,
    [organisatieId, "ai_model", uitkomst.geldig, uitkomst.bewijs],
  );
  log.info("validatie vastgelegd", {
    koppeling: "ai_model",
    geldig: uitkomst.geldig,
    http: uitkomst.httpStatus,
  });
}

/* ------------------------------------------------------------------
   3. Allowlist
   ------------------------------------------------------------------ */

export type AllowlistUitkomst = { toegestaan: boolean; reden: string };

/**
 * Mag dit model aangeroepen worden?
 *
 * Een LEGE allowlist betekent: niets. Dat is bewust de veilige kant.
 */
export async function isModelToegestaan(
  c: pg.PoolClient,
  provider: string,
  model: string,
): Promise<AllowlistUitkomst> {
  const alle = await rijen<{ model: string; toegestaan_op: string; reden: string }>(
    c,
    "select model, toegestaan_op::text as toegestaan_op, reden from intel.ai_toegestane_modellen where provider = $1 order by model",
    [provider],
  );
  if (alle.length === 0) {
    return {
      toegestaan: false,
      reden:
        `de allowlist intel.ai_toegestane_modellen is leeg voor provider '${provider}'. ` +
        "Leeg betekent niets toegestaan; dat is de veilige kant. Voeg het model toe met " +
        "`npm run ai -- --sta-model-toe`.",
    };
  }
  const treffer = alle.find((a) => a.model === model);
  if (!treffer) {
    return {
      toegestaan: false,
      reden:
        `model '${model}' staat niet op de allowlist. Toegestaan zijn: ` +
        alle.map((a) => a.model).join(", "),
    };
  }
  return {
    toegestaan: true,
    reden: `toegestaan sinds ${treffer.toegestaan_op}: ${treffer.reden}`,
  };
}

/* ------------------------------------------------------------------
   4. Budget: dag, maand, tokens en kosten
   ------------------------------------------------------------------ */

export type BudgetStand = {
  readonly mag: boolean;
  readonly reden: string;
  readonly dagAanroepen: { gebruikt: number; plafond: number | null };
  readonly maandAanroepen: { gebruikt: number; plafond: number | null };
  readonly maandTokensUit: { gebruikt: number; plafond: number | null };
  readonly maandKosten: { gemeten: number; plafond: number | null; valuta: string | null; onbekendeAanroepen: number };
};

/**
 * Volledige budgetcontrole vóór een aanroep.
 *
 * De kostengrens handhaaft ALLEEN op aanroepen met een gemeten tarief.
 * Aanroepen waarvan de kosten ONBEKEND zijn worden geteld en gemeld,
 * maar niet geschat — een geschat bedrag dat een grens overschrijdt
 * zou het platform stilzetten op een getal dat niemand heeft gemeten.
 */
export async function budgetStand(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<BudgetStand> {
  const p = await eenRij<{
    actief: boolean;
    max_ai_aanroepen_per_dag: number;
    max_ai_aanroepen_per_maand: number | null;
    max_tokens_uit_per_maand: string | null;
    max_kosten_per_maand: string | null;
  }>(
    c,
    `select actief, max_ai_aanroepen_per_dag, max_ai_aanroepen_per_maand,
            max_tokens_uit_per_maand, max_kosten_per_maand
       from intel.kostenplafonds where organisatie_id = $1`,
    [organisatieId],
  );

  const g = await eenRij<{
    dag: number;
    maand: number;
    tokens_maand: string;
    kosten_maand: string;
    onbekend_maand: number;
    valuta: string | null;
  }>(
    c,
    `select count(*) filter (where op >= date_trunc('day', now()))::int          as dag,
            count(*) filter (where op >= date_trunc('month', now()))::int        as maand,
            coalesce(sum(tokens_uit) filter (where op >= date_trunc('month', now())), 0)::text as tokens_maand,
            coalesce(sum(kosten_schatting) filter (
              where op >= date_trunc('month', now()) and kosten_bron <> 'onbekend'
            ), 0)::text                                                          as kosten_maand,
            count(*) filter (
              where op >= date_trunc('month', now()) and kosten_bron = 'onbekend'
            )::int                                                               as onbekend_maand,
            (array_agg(valuta) filter (where valuta is not null))[1]             as valuta
       from intel.ai_aanroepen where organisatie_id = $1`,
    [organisatieId],
  );

  const stand: BudgetStand = {
    mag: true,
    reden: "",
    dagAanroepen: { gebruikt: g?.dag ?? 0, plafond: p?.actief ? p.max_ai_aanroepen_per_dag : null },
    maandAanroepen: { gebruikt: g?.maand ?? 0, plafond: p?.actief ? p.max_ai_aanroepen_per_maand : null },
    maandTokensUit: {
      gebruikt: Number(g?.tokens_maand ?? 0),
      plafond: p?.actief && p.max_tokens_uit_per_maand ? Number(p.max_tokens_uit_per_maand) : null,
    },
    maandKosten: {
      gemeten: Number(g?.kosten_maand ?? 0),
      plafond: p?.actief && p.max_kosten_per_maand ? Number(p.max_kosten_per_maand) : null,
      valuta: g?.valuta ?? null,
      onbekendeAanroepen: g?.onbekend_maand ?? 0,
    },
  };

  if (!p || !p.actief) {
    return { ...stand, mag: true, reden: "geen actief kostenplafond ingesteld" };
  }

  const grenzen: { naam: string; gebruikt: number; plafond: number | null }[] = [
    { naam: "aanroepen vandaag", gebruikt: stand.dagAanroepen.gebruikt, plafond: stand.dagAanroepen.plafond },
    { naam: "aanroepen deze maand", gebruikt: stand.maandAanroepen.gebruikt, plafond: stand.maandAanroepen.plafond },
    { naam: "uitvoertokens deze maand", gebruikt: stand.maandTokensUit.gebruikt, plafond: stand.maandTokensUit.plafond },
    { naam: "gemeten kosten deze maand", gebruikt: stand.maandKosten.gemeten, plafond: stand.maandKosten.plafond },
  ];

  for (const grens of grenzen) {
    if (grens.plafond !== null && grens.gebruikt >= grens.plafond) {
      return {
        ...stand,
        mag: false,
        reden: `plafond bereikt op ${grens.naam}: ${grens.gebruikt} van ${grens.plafond}`,
      };
    }
  }

  return {
    ...stand,
    mag: true,
    reden:
      `binnen alle plafonds (dag ${stand.dagAanroepen.gebruikt}/${stand.dagAanroepen.plafond}, ` +
      `maand ${stand.maandAanroepen.gebruikt}/${stand.maandAanroepen.plafond ?? "geen"})`,
  };
}

/* ------------------------------------------------------------------
   5. Stroomonderbreker
   ------------------------------------------------------------------ */

export const ONDERBREKER_DREMPEL = 5;
export const ONDERBREKER_DUUR_MS = 15 * 60_000;

export type OnderbrekerStand = {
  readonly open: boolean;
  readonly reden: string | null;
  readonly openTot: string | null;
  readonly misluktAchtereen: number;
};

/** Staat de onderbreker open (dus: nu NIET aanroepen)? */
export async function onderbrekerStand(
  c: pg.PoolClient,
  organisatieId: number,
  onderdeel = "ai_model",
): Promise<OnderbrekerStand> {
  const r = await eenRij<{
    open_tot: string | null;
    reden: string | null;
    mislukt_achtereen: number;
    nog_open: boolean;
  }>(
    c,
    `select open_tot::text as open_tot, reden, mislukt_achtereen,
            coalesce(open_tot > now(), false) as nog_open
       from intel.ai_stroomonderbreker
      where organisatie_id = $1 and onderdeel = $2`,
    [organisatieId, onderdeel],
  );
  if (!r) return { open: false, reden: null, openTot: null, misluktAchtereen: 0 };
  return {
    open: r.nog_open,
    reden: r.nog_open ? r.reden : null,
    openTot: r.nog_open ? r.open_tot : null,
    misluktAchtereen: r.mislukt_achtereen,
  };
}

/**
 * Meldt een mislukte aanroep. Opent de onderbreker op de drempel.
 *
 * `open_tot` is een TIJDSTIP en geen vlag, om dezelfde reden als bij
 * de wachtrijlease: een vlag die door een crash aan blijft staan zet
 * het onderdeel voor altijd uit, en dan is de onderbreker zelf de
 * storing geworden.
 */
export async function meldMislukking(
  c: pg.PoolClient,
  organisatieId: number,
  reden: string,
  onderdeel = "ai_model",
): Promise<OnderbrekerStand> {
  const r = await eenRij<{ mislukt_achtereen: number; nog_open: boolean; open_tot: string | null }>(
    c,
    `insert into intel.ai_stroomonderbreker
       (organisatie_id, onderdeel, mislukt_achtereen, bijgewerkt_op)
     values ($1, $2, 1, now())
     on conflict (organisatie_id, onderdeel) do update
       set mislukt_achtereen = intel.ai_stroomonderbreker.mislukt_achtereen + 1,
           bijgewerkt_op = now()
     returning mislukt_achtereen, coalesce(open_tot > now(), false) as nog_open, open_tot::text as open_tot`,
    [organisatieId, onderdeel],
  );
  const aantal = r?.mislukt_achtereen ?? 1;

  if (aantal >= ONDERBREKER_DREMPEL) {
    const na = await eenRij<{ open_tot: string }>(
      c,
      `update intel.ai_stroomonderbreker
          set open_tot = now() + make_interval(secs => $3),
              reden = $4,
              geopend_op = now(),
              keer_geopend = keer_geopend + 1,
              mislukt_achtereen = 0,
              bijgewerkt_op = now()
        where organisatie_id = $1 and onderdeel = $2
        returning open_tot::text as open_tot`,
      [
        organisatieId,
        onderdeel,
        ONDERBREKER_DUUR_MS / 1000,
        `${aantal} mislukte aanroepen achtereen; laatste: ${reden.slice(0, 200)}`,
      ],
    );
    log.fout("stroomonderbreker geopend", { onderdeel, mislukt: aantal, open_tot: na?.open_tot });
    return {
      open: true,
      reden: `${aantal} mislukte aanroepen achtereen`,
      openTot: na?.open_tot ?? null,
      misluktAchtereen: 0,
    };
  }

  return {
    open: r?.nog_open ?? false,
    reden: null,
    openTot: r?.open_tot ?? null,
    misluktAchtereen: aantal,
  };
}

/** Meldt een geslaagde aanroep: de teller gaat terug naar nul. */
export async function meldSucces(
  c: pg.PoolClient,
  organisatieId: number,
  onderdeel = "ai_model",
): Promise<void> {
  await c.query(
    `insert into intel.ai_stroomonderbreker (organisatie_id, onderdeel, mislukt_achtereen)
     values ($1, $2, 0)
     on conflict (organisatie_id, onderdeel) do update
       set mislukt_achtereen = 0, bijgewerkt_op = now()`,
    [organisatieId, onderdeel],
  );
}

/* ------------------------------------------------------------------
   6. Tarieven
   ------------------------------------------------------------------ */

export type TariefInvoer = {
  readonly provider: string;
  readonly model: string;
  readonly prijsInPerMiljoen: number;
  readonly prijsUitPerMiljoen: number;
  readonly valuta: string;
  readonly bronUrl: string;
  readonly gemetenOp: string;
};

/**
 * Legt een tarief vast. Weigert zonder bron-URL en meetdatum.
 *
 * Dat is het hele punt. Een tarief zonder herkomst is een verzonnen
 * getal, en een verzonnen getal in een kostenberekening is erger dan
 * ONBEKEND: ONBEKEND weet je nog dat je het niet weet.
 */
export function controleerTarief(invoer: Partial<TariefInvoer>): string[] {
  const fouten: string[] = [];
  if (!invoer.provider) fouten.push("provider ontbreekt");
  if (!invoer.model) fouten.push("model ontbreekt");
  if (typeof invoer.prijsInPerMiljoen !== "number" || !(invoer.prijsInPerMiljoen >= 0)) {
    fouten.push("prijs-in per miljoen tokens ontbreekt of is negatief");
  }
  if (typeof invoer.prijsUitPerMiljoen !== "number" || !(invoer.prijsUitPerMiljoen >= 0)) {
    fouten.push("prijs-uit per miljoen tokens ontbreekt of is negatief");
  }
  if (!invoer.valuta || !/^[A-Z]{3}$/.test(invoer.valuta)) {
    fouten.push("valuta ontbreekt of is geen drieletterige code (USD, EUR)");
  }
  if (!invoer.bronUrl || !/^https:\/\//.test(invoer.bronUrl)) {
    fouten.push(
      "bron-URL ontbreekt of is geen https-URL. Een tarief zonder herkomst is een verzonnen getal",
    );
  }
  if (!invoer.gemetenOp || !/^\d{4}-\d{2}-\d{2}$/.test(invoer.gemetenOp)) {
    fouten.push("meetdatum ontbreekt of is geen ISO-datum. Tarieven veranderen; zonder datum is dit niet na te kijken");
  }
  return fouten;
}

/* ClientBase en niet PoolClient: een tarief vastleggen is een
   OPERATORactie en loopt dus als eigenaar, en die verbinding is een
   losse pg.Client en geen poolclient. Gevonden door de toets, die het
   via alsEigenaar() doet net als de CLI. */
export async function legTariefVast(c: pg.ClientBase, invoer: TariefInvoer): Promise<void> {
  const fouten = controleerTarief(invoer);
  if (fouten.length) throw new Error(`tarief geweigerd: ${fouten.join("; ")}`);
  await c.query(
    `insert into intel.ai_prijzen
       (provider, model, prijs_in_per_miljoen, prijs_uit_per_miljoen, valuta, bron_url, gemeten_op)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (provider, model) do update set
       prijs_in_per_miljoen = excluded.prijs_in_per_miljoen,
       prijs_uit_per_miljoen = excluded.prijs_uit_per_miljoen,
       valuta = excluded.valuta,
       bron_url = excluded.bron_url,
       gemeten_op = excluded.gemeten_op`,
    [
      invoer.provider,
      invoer.model,
      invoer.prijsInPerMiljoen,
      invoer.prijsUitPerMiljoen,
      invoer.valuta,
      invoer.bronUrl,
      invoer.gemetenOp,
    ],
  );
  log.info("tarief vastgelegd", {
    provider: invoer.provider,
    model: invoer.model,
    bron: invoer.bronUrl,
    gemeten_op: invoer.gemetenOp,
  });
}
