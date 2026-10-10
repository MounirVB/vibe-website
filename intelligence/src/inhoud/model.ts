/* ============================================================
   INHOUD — de modellaag
   ------------------------------------------------------------
   Het model mag formuleren. Het mag niet bepalen welk getal er staat,
   welk gebied erbij hoort of of er gepubliceerd wordt — dat doet
   deterministische code, en de poorten controleren het daarna.

   Drie dingen die hier geregeld zijn:

   1. KOSTENPLAFOND VOOR DE AANROEP. Het dagplafond uit
      intel.kostenplafonds wordt gecontroleerd vóór de aanroep, niet
      erna. Een doorgeschoten lus kost dan één aanroep, geen duizend.
   2. GEEN BEWEGENDE ALIASSEN. Een modelnaam zonder versie wijst
      vandaag naar iets anders dan morgen; dezelfde promptafdruk zou
      dan twee verschillende modellen kunnen betekenen. Dat wordt
      gemeld en vastgelegd per aanroep.
   3. KOSTEN ZIJN ONBEKEND TENZIJ GEMETEN. intel.ai_prijzen is bij
      installatie leeg. Zonder rij daarin blijft kosten_schatting NULL
      en staat kosten_bron op 'onbekend'. Een verzonnen tarief is erger
      dan geen tarief.

   Zonder sleutel draait het platform door: de deterministische
   provider stelt een concept samen uit de eigen uitspraken. Dat levert
   zakelijker proza, maar het haalt wel alle poorten.
   ============================================================ */

import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { eenRij } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";
import { sha256hex } from "../kern/tekst.ts";

const log = maakLogger("model");

export type ModelOpdracht = {
  readonly doel: string;
  readonly systeem: string;
  readonly gebruiker: string;
  readonly maxTokensUit?: number;
};

export type ModelAntwoord = {
  readonly tekst: string;
  readonly provider: string;
  readonly model: string;
  readonly tokensIn: number | null;
  readonly tokensUit: number | null;
  readonly duurMs: number;
  readonly promptHash: string;
};

export type Provider = {
  readonly naam: string;
  readonly model: string;
  beschikbaar(): { ja: boolean; reden: string };
  genereer(opdracht: ModelOpdracht): Promise<ModelAntwoord>;
};

/**
 * Ziet deze modelnaam eruit als een vastgezette versie? Een naam met
 * een datum of expliciet versienummer wel; 'gpt-5' of iets met
 * 'latest' niet.
 */
export function isGepindModel(model: string): boolean {
  if (/latest|preview|experimental/i.test(model)) return false;
  return /-\d{4}-\d{2}-\d{2}$|-\d{8}$|-\d{4}$/.test(model);
}

// ------------------------------------------------------------
// OpenAI
// ------------------------------------------------------------

export function maakOpenAiProvider(): Provider {
  const config = configLezen();
  return {
    naam: "openai",
    model: config.aiModel,
    beschikbaar() {
      if (!config.aiSleutelAanwezig) {
        return { ja: false, reden: "OPENAI_API_KEY ontbreekt in de omgeving" };
      }
      if (!config.netwerkToegestaan) {
        return { ja: false, reden: "netwerk uitgeschakeld (INTEL_NETWERK_TOEGESTAAN=0)" };
      }
      return { ja: true, reden: `model ${config.aiModel}` };
    },
    async genereer(opdracht) {
      const start = Date.now();
      const sleutel = process.env["OPENAI_API_KEY"];
      if (!sleutel) throw new IntelFout("configuratie", "OPENAI_API_KEY ontbreekt");

      const body = {
        model: config.aiModel,
        messages: [
          { role: "system", content: opdracht.systeem },
          { role: "user", content: opdracht.gebruiker },
        ],
        max_completion_tokens: opdracht.maxTokensUit ?? config.aiMaxTokensUit,
      };
      const promptHash = sha256hex(`${opdracht.systeem}\n---\n${opdracht.gebruiker}`);

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 120_000);
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${sleutel}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        const ruw = await r.text();
        if (!r.ok) {
          // Geen providerpayload doorgeven aan de aanroeper; die kan
          // sleutelfragmenten of promptinhoud bevatten.
          log.fout("modelaanroep mislukt", { status: r.status, antwoord: ruw.slice(0, 500) });
          throw new IntelFout("model", `OpenAI gaf HTTP ${r.status}`, {
            herhaalbaar: r.status === 429 || r.status >= 500,
            context: { status: r.status },
          });
        }
        const ontleed = JSON.parse(ruw) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          model?: string;
        };
        const tekst = ontleed.choices?.[0]?.message?.content ?? "";
        if (!tekst.trim()) {
          throw new IntelFout("model", "OpenAI gaf een leeg antwoord");
        }
        return {
          tekst,
          provider: "openai",
          // Het model dat de provider TERUGGEEFT, niet wat wij vroegen:
          // bij een alias zijn dat twee verschillende dingen.
          model: ontleed.model ?? config.aiModel,
          tokensIn: ontleed.usage?.prompt_tokens ?? null,
          tokensUit: ontleed.usage?.completion_tokens ?? null,
          duurMs: Date.now() - start,
          promptHash,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ------------------------------------------------------------
// Deterministisch, zonder model
// ------------------------------------------------------------

/**
 * Stelt tekst samen uit de meegegeven bouwstenen. Niet mooi, wel
 * volledig herleidbaar — en het laat het platform werken zonder
 * sleutel, wat de testsuite nodig heeft.
 */
export function maakDeterministischeProvider(): Provider {
  return {
    naam: "deterministisch",
    model: "zonder-model-v1",
    beschikbaar() {
      return { ja: true, reden: "stelt tekst samen uit de eigen uitspraken, zonder modelaanroep" };
    },
    async genereer(opdracht) {
      const start = Date.now();
      return {
        tekst: opdracht.gebruiker,
        provider: "deterministisch",
        model: "zonder-model-v1",
        tokensIn: null,
        tokensUit: null,
        duurMs: Date.now() - start,
        promptHash: sha256hex(opdracht.gebruiker),
      };
    },
  };
}

export function kiesProvider(opties: { forceerDeterministisch?: boolean } = {}): Provider {
  const config = configLezen();
  if (opties.forceerDeterministisch || config.aiProvider === "geen") {
    return maakDeterministischeProvider();
  }
  const openai = maakOpenAiProvider();
  const beschikbaar = openai.beschikbaar();
  if (!beschikbaar.ja) {
    log.waarschuwing("modelprovider niet beschikbaar, deterministisch terugvallen", {
      reden: beschikbaar.reden,
    });
    return maakDeterministischeProvider();
  }
  if (!isGepindModel(openai.model)) {
    log.waarschuwing("modelnaam is geen vastgezette versie", {
      model: openai.model,
      gevolg:
        "dezelfde promptafdruk kan over tijd een ander model betekenen; de provider-respons " +
        "wordt per aanroep vastgelegd zodat het achteraf te zien is",
    });
  }
  return openai;
}

// ------------------------------------------------------------
// Budget en boekhouding
// ------------------------------------------------------------

export type BudgetUitkomst = { mag: boolean; reden: string; gebruiktVandaag: number; plafond: number };

/** Controleert het dagplafond VOORDAT er een aanroep gedaan wordt. */
export async function controleerBudget(
  c: pg.PoolClient,
  organisatieId: number,
): Promise<BudgetUitkomst> {
  const plafond = await eenRij<{ max_ai_aanroepen_per_dag: number; actief: boolean }>(
    c,
    "select max_ai_aanroepen_per_dag, actief from intel.kostenplafonds where organisatie_id = $1",
    [organisatieId],
  );
  if (!plafond || !plafond.actief) {
    return { mag: true, reden: "geen actief plafond ingesteld", gebruiktVandaag: 0, plafond: 0 };
  }
  const gebruik = await eenRij<{ n: number }>(
    c,
    `select count(*)::int as n from intel.ai_aanroepen
      where organisatie_id = $1 and op >= date_trunc('day', now())`,
    [organisatieId],
  );
  const n = gebruik?.n ?? 0;
  if (n >= plafond.max_ai_aanroepen_per_dag) {
    return {
      mag: false,
      reden: `dagplafond bereikt: ${n} van ${plafond.max_ai_aanroepen_per_dag} aanroepen`,
      gebruiktVandaag: n,
      plafond: plafond.max_ai_aanroepen_per_dag,
    };
  }
  return {
    mag: true,
    reden: `${n} van ${plafond.max_ai_aanroepen_per_dag} aanroepen vandaag`,
    gebruiktVandaag: n,
    plafond: plafond.max_ai_aanroepen_per_dag,
  };
}

/** Legt een aanroep vast. Kosten blijven ONBEKEND zonder gemeten tarief. */
export async function boekAanroep(
  c: pg.PoolClient,
  organisatieId: number,
  invoer: {
    doel: string;
    antwoord: ModelAntwoord | null;
    provider: string;
    model: string;
    promptHash: string;
    geslaagd: boolean;
    foutSoort?: string | null;
    taakId?: number | null;
  },
): Promise<void> {
  const tarief = await eenRij<{
    prijs_in_per_miljoen: string;
    prijs_uit_per_miljoen: string;
    valuta: string;
  }>(
    c,
    "select prijs_in_per_miljoen, prijs_uit_per_miljoen, valuta from intel.ai_prijzen where provider = $1 and model = $2",
    [invoer.provider, invoer.model],
  );

  let kosten: string | null = null;
  let valuta: string | null = null;
  let kostenBron = "onbekend";
  if (tarief && invoer.antwoord) {
    const in_ = invoer.antwoord.tokensIn ?? 0;
    const uit = invoer.antwoord.tokensUit ?? 0;
    const bedrag =
      (in_ / 1_000_000) * Number(tarief.prijs_in_per_miljoen) +
      (uit / 1_000_000) * Number(tarief.prijs_uit_per_miljoen);
    kosten = bedrag.toFixed(6);
    valuta = tarief.valuta;
    kostenBron = "intel.ai_prijzen";
  }

  await c.query(
    `insert into intel.ai_aanroepen
       (organisatie_id, doel, provider, model, prompt_hash, tokens_in, tokens_uit,
        kosten_schatting, valuta, kosten_bron, duur_ms, geslaagd, fout_soort, taak_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      organisatieId,
      invoer.doel,
      invoer.provider,
      invoer.model,
      invoer.promptHash,
      invoer.antwoord?.tokensIn ?? null,
      invoer.antwoord?.tokensUit ?? null,
      kosten,
      valuta,
      kostenBron,
      invoer.antwoord?.duurMs ?? null,
      invoer.geslaagd,
      invoer.foutSoort ?? null,
      invoer.taakId ?? null,
    ],
  );
}
