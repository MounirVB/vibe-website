/* ============================================================
   OPS — bronDEKKING: wat betekent 'overgeslagen' eigenlijk
   ------------------------------------------------------------
   WAAROM DIT BESTAAT.

   Een ophaalronde meldde op 13 oktober 2026: `bronnen 1 (ok 1, fout 0,
   overgeslagen 19)`. Dat getal 19 is op zichzelf onleesbaar. Negentien
   overgeslagen bronnen kan betekenen dat er negentien kapot zijn, of dat
   er negentien netjes nog niet toe waren — en dat verschil is het hele
   verhaal.

   Gemeten op de ontwikkeldatabase stonden er 29 bronnen: 20 actief en 9
   uit. Van die negen was er GEEN ENKELE kapot:

     robots verboden          koop-gemeenteblad, koop-staatscourant
     TDM-voorbehoud           elaad-laadinfra, energeia, solar-magazine
     toestemming onbekend     logistiek-hotspots, tennet-publicaties,
                              energieonderbrekingen-storingen
     botbescherming           rvo-subsidie-sitemap (HTTP 500 op onze
                              user-agent, 200 op een browser-UA; de UA
                              vermommen zou een toegangscontrole
                              omzeilen en is daarom niet gedaan — de
                              geautoriseerde route rvo-opendata-artikelen
                              dekt hetzelfde)

   Elke uitgezette bron draagt die verantwoording in
   `verificatie_bewijs`. Dit bestand maakt dat MEETBAAR in plaats van
   leesbaar-als-je-het-weet.

   EEN OVERGESLAGEN BRON IS GEEN GEFAALDE BRON. Dat is de regel van
   par. 18, en hij zit hier in de classificatie: alleen
   `opeenvolgende_fouten` maakt een bron DEGRADED of FAILED. Een
   ontbrekende toestemming is ACCESS_RESTRICTED en blijft dat, hoe lang
   hij ook niet is opgehaald.

   STRIKT ALLEEN-LEZEN.
   ============================================================ */

import type pg from "pg";

import { rijen, type Leesclient } from "../kern/db.ts";

/** Precies één klasse per bron; de orde hieronder is de prioriteit. */
export type Bronklasse =
  /** Toestemming is niet vastgesteld of expliciet geweigerd. */
  | "ACCESS_RESTRICTED"
  /** Bewust uit, zonder toestemmingsprobleem. */
  | "DISABLED"
  /** Actief, maar drie of meer keer achtereen gefaald. */
  | "FAILED"
  /** Actief, met een storing of een paar fouten; werkt nog deels. */
  | "DEGRADED"
  /** Actief en de laatste poging slaagde. */
  | "SUCCESS"
  /** Actief, geen fouten, maar nog nooit opgehaald. */
  | "ONBEKEND";

export type BronStand = {
  readonly sleutel: string;
  readonly klasse: Bronklasse;
  /** Of hij op dit moment aan de beurt is; spiegelt isToeAanOphalen. */
  readonly toe: boolean;
  readonly reden: string;
};

export type Brondekking = {
  readonly totaal: number;
  readonly actief: number;
  /** Actief EN op dit moment aan de beurt. */
  readonly toe: number;
  /** Actief maar nog niet aan de beurt: het leesbare deel van 'overgeslagen'. */
  readonly nietToe: number;
  readonly perKlasse: Readonly<Record<Bronklasse, number>>;
  readonly laatsteGeslaagdeOphaling: string | null;
  readonly bronnen: readonly BronStand[];
};

const LEEG: Record<Bronklasse, number> = {
  ACCESS_RESTRICTED: 0,
  DISABLED: 0,
  FAILED: 0,
  DEGRADED: 0,
  SUCCESS: 0,
  ONBEKEND: 0,
};

/**
 * Classificeert elke bron binnen één organisatie.
 *
 * De `toe`-berekening spiegelt isToeAanOphalen() uit
 * pijplijn/verzamelen.ts: opgeschort telt niet mee, nooit opgehaald is
 * altijd toe, en anders beslist het interval. Zou die logica hier
 * afwijken, dan zou de monitor een ander aantal 'toe' melden dan de
 * collector gebruikt, en dan is de meting misleidend.
 */
export async function meetBrondekking(
  c: Leesclient,
  organisatieId: number,
): Promise<Brondekking> {
  const r = await rijen<{
    sleutel: string;
    actief: boolean;
    robots_status: string | null;
    tdm_status: string | null;
    storingssoort: string | null;
    opeenvolgende_fouten: number;
    laatste_resultaat: string | null;
    opgeschort: boolean;
    toe: boolean;
    laatst_opgehaald_op: string | null;
  }>(
    c,
    `select sleutel,
            actief,
            robots_status,
            tdm_status,
            storingssoort,
            opeenvolgende_fouten,
            laatste_resultaat,
            coalesce(ophalen_opgeschort_tot > now(), false) as opgeschort,
            case
              when coalesce(ophalen_opgeschort_tot > now(), false) then false
              when laatst_opgehaald_op is null then true
              else (now() - laatst_opgehaald_op) >= make_interval(mins => ophaalinterval_minuten)
            end as toe,
            laatst_opgehaald_op::text
       from intel.bronnen
      where organisatie_id = $1
      order by sleutel`,
    [organisatieId],
  );

  const perKlasse: Record<Bronklasse, number> = { ...LEEG };
  const bronnen: BronStand[] = [];
  let laatste: string | null = null;

  for (const b of r) {
    /* TOESTEMMING EERST. Een bron zonder vastgestelde toestemming is
       geen kapotte bron en geen uitgezette bron: hij mag niet. Dat
       onderscheid moet bovenaan staan, want anders verdwijnt het achter
       'DISABLED' en lijkt het een keuze van ons. */
    const toestemmingOk = b.robots_status === "toegestaan" && b.tdm_status === "geen_voorbehoud";

    let klasse: Bronklasse;
    let reden: string;
    if (!toestemmingOk) {
      klasse = "ACCESS_RESTRICTED";
      reden = `robots ${b.robots_status ?? "onbekend"}, tdm ${b.tdm_status ?? "onbekend"}`;
    } else if (!b.actief) {
      klasse = "DISABLED";
      reden = "bewust uitgezet; toestemming is wel in orde";
    } else if (b.opeenvolgende_fouten >= 3) {
      klasse = "FAILED";
      reden = `${b.opeenvolgende_fouten} fouten achtereen`;
    } else if (b.opeenvolgende_fouten > 0 || b.storingssoort || b.opgeschort) {
      klasse = "DEGRADED";
      reden = b.opgeschort
        ? `opgeschort${b.storingssoort ? ` na ${b.storingssoort}` : ""}`
        : b.storingssoort
          ? `storing ${b.storingssoort}`
          : `${b.opeenvolgende_fouten} fout(en) achtereen`;
    } else if (!b.laatst_opgehaald_op) {
      klasse = "ONBEKEND";
      reden = "actief en zonder fouten, maar nog nooit opgehaald";
    } else {
      klasse = "SUCCESS";
      reden = `laatste poging ${b.laatste_resultaat ?? "onbekend"}`;
    }

    perKlasse[klasse] += 1;
    bronnen.push({ sleutel: b.sleutel, klasse, toe: b.toe, reden });
    if (b.laatst_opgehaald_op && (!laatste || b.laatst_opgehaald_op > laatste)) {
      laatste = b.laatst_opgehaald_op;
    }
  }

  const actief = r.filter((b) => b.actief).length;
  const toe = r.filter((b) => b.actief && b.toe).length;

  return {
    totaal: r.length,
    actief,
    toe,
    nietToe: actief - toe,
    perKlasse,
    laatsteGeslaagdeOphaling: laatste,
    bronnen,
  };
}

/** Een korte, leesbare samenvatting voor een logregel of een signaal. */
export function vatBrondekkingSamen(d: Brondekking): string {
  const k = d.perKlasse;
  /* DE SLEUTELS VAN DE FAILED-BRONNEN HOREN IN DE SAMENVATTING.
     Deze functie gaf uitsluitend aantallen, terwijl `d.bronnen` met
     sleutel, klasse en reden in dezelfde structuur beschikbaar is. Het
     signaal dat deze string als `meting` gebruikt, is een FOUT-signaal;
     een rood signaal dat niet zegt WELKE bron rood is, kost een tweede
     commando dat de lezer moet kennen. Beide buursignalen in dezelfde
     groep noemen hun sleutels wel.
     Alleen FAILED, en niet elke niet-SUCCES-klasse: ACCESS_RESTRICTED en
     DISABLED zijn verantwoorde grenzen en geen storing — dat is de regel
     uit de kop van dit bestand. */
  const gefaald = d.bronnen
    .filter((b) => b.klasse === "FAILED")
    .map((b) => b.sleutel)
    .sort();
  const staart = gefaald.length ? ` — FAILED: ${gefaald.join(", ").slice(0, 160)}` : "";
  return (
    `${d.totaal} bronnen: ${d.actief} actief (${d.toe} toe, ${d.nietToe} nog niet toe), ` +
    `SUCCESS ${k.SUCCESS}, DEGRADED ${k.DEGRADED}, FAILED ${k.FAILED}, ` +
    `ACCESS_RESTRICTED ${k.ACCESS_RESTRICTED}, DISABLED ${k.DISABLED}, ONBEKEND ${k.ONBEKEND}` +
    staart
  );
}
