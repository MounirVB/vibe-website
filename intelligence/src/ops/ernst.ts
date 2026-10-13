/* ============================================================
   OPS — ernstmodel per domein (par. 18)
   ------------------------------------------------------------
   `meetGezondheid()` levert losse signalen met vier niveaus. Dat is
   genoeg om één meting te lezen, maar niet om de vraag te beantwoorden
   die een mens stelt: moet ik NU iets doen, en zo ja waaraan?

   Deze module doet twee dingen:

   1. Hij groepeert de signalen in de acht domeinen van par. 18, zodat
      'de redactie levert niets' niet verdwijnt achter 'de database is
      in orde'.

   2. Hij vertaalt niveau naar ERNST, en dat is een ander begrip. Een
      ontbrekende back-up en een bron die traag is zijn beide 'FOUT',
      maar het eerste bedreigt de gegevens en het tweede lost zichzelf
      op. Vier trappen:

        HEALTHY          gemeten en in orde
        DEGRADED         werkt met beperking; herstelt zichzelf of is
                         een bekende, aanvaarde grens
        ACTION_REQUIRED  er is een mens nodig; niets herstelt dit
                         automatisch
        CRITICAL         de gegevens of de toegang zijn in gevaar

   DE REGEL DIE DE OPDRACHT EXPLICIET STELT
   Een bekende, beperkte bron maakt het platform niet ongezond zolang de
   rest werkt. Dat is hier geen uitzondering maar een eigenschap van het
   model: een signaal met `aanvaard` komt niet boven DEGRADED uit. Hij
   verdwijnt NIET — hij staat met naam en meting in zijn domein, en het
   rapport zegt expliciet hoeveel aanvaarde beperkingen er zijn. Par. 20:
   niets wegmoffelen om een groen dashboard te krijgen.

   EN DE OMGEKEERDE REGEL
   'NIET GEMETEN' is nooit HEALTHY. Een meting die niet is uitgevoerd
   zegt niets over de werkelijkheid, en dat als groen tonen is de ergste
   vorm van wegmoffelen: je ziet niet eens dat je niets weet.
   ============================================================ */

import type { Niveau, Signaal } from "./gezondheid.ts";

export type Ernst = "HEALTHY" | "DEGRADED" | "ACTION_REQUIRED" | "CRITICAL";

export const ERNST_ORDE: Readonly<Record<Ernst, number>> = {
  HEALTHY: 0,
  DEGRADED: 1,
  ACTION_REQUIRED: 2,
  CRITICAL: 3,
};

/** De acht domeinen van par. 18. */
export type Domein =
  | "platform"
  | "database"
  | "authenticatie"
  | "sitekennis"
  | "redactie"
  | "connectoren"
  | "backup"
  | "publicatie"
  /* NIEUW IN 3.0.5. De alerteringsbestemming stond onder `koppelingen`
     en dus in het domein Connectoren. Het dashboard meldde daardoor
     "Connectoren ACTION_REQUIRED" terwijl alle twintig actieve bronnen
     gezond waren en het werkelijke punt een ontbrekende meldbestemming
     was. Een lezer die dan de bronnen gaat nakijken, zoekt op de
     verkeerde plek. */
  | "monitoring";

export const DOMEIN_LABEL: Readonly<Record<Domein, string>> = {
  platform: "Platform",
  database: "Database",
  authenticatie: "Authenticatie",
  sitekennis: "Sitekennis",
  redactie: "Redactie",
  connectoren: "Connectoren",
  backup: "Back-up",
  publicatie: "Publicatie",
  monitoring: "Monitoring",
};

/**
 * Van signaalgroep naar domein.
 *
 * `planner` en `worker` vormen samen het platform: als die stilstaan
 * gebeurt er niets meer, ongeacht hoe gezond de rest meet.
 */
const GROEP_DOMEIN: Readonly<Record<string, Domein>> = {
  planner: "platform",
  worker: "platform",
  ai: "platform",
  database: "database",
  beveiliging: "authenticatie",
  sitekennis: "sitekennis",
  ingestie: "connectoren",
  koppelingen: "connectoren",
  backup: "backup",
  publicatie: "publicatie",
  redactie: "redactie",
  melden: "monitoring",
};

/**
 * Domeinen waarin een harde fout de GEGEVENS of de TOEGANG raakt.
 *
 * Alleen hier wordt FOUT ook CRITICAL. Een kapotte connector is hinder;
 * een database die niet antwoordt of een back-up die niet bestaat is
 * iets anders, want daar kun je niet van terugkomen door te wachten.
 */
const KRITIEKE_DOMEINEN = new Set<Domein>(["database", "authenticatie", "backup"]);

export type DomeinUitslag = {
  readonly domein: Domein;
  readonly ernst: Ernst;
  readonly signalen: readonly Signaal[];
  /** Hoeveel van de signalen een bekende, aanvaarde beperking zijn. */
  readonly aanvaard: number;
  /** De zwaarste reden, voor het dashboard. */
  readonly reden: string;
};

export type ErnstRapport = {
  readonly totaal: Ernst;
  readonly domeinen: readonly DomeinUitslag[];
  /** Totaal aantal aanvaarde beperkingen over alle domeinen. */
  readonly aanvaardTotaal: number;
  /** Signalen die niet gemeten zijn. Nooit groen. */
  readonly nietGemeten: readonly Signaal[];
  readonly samenvatting: string;
};

function domeinVan(groep: string): Domein {
  /* Een onbekende groep valt op 'platform': dat is het enige domein
     waar 'ik weet niet waar dit hoort' geen verkeerde belofte doet. */
  return GROEP_DOMEIN[groep] ?? "platform";
}

/** Van niveau naar ernst, met het domein als context. */
export function ernstVan(signaal: Signaal, domein: Domein): Ernst {
  /* AANVAARDE BEPERKING: nooit boven DEGRADED.
     Dit is de regel uit par. 18, en hij staat vóór alle andere zodat
     geen enkele latere tak hem kan overschrijven. */
  if (signaal.aanvaard === true) {
    return signaal.niveau === "OK" ? "HEALTHY" : "DEGRADED";
  }

  switch (signaal.niveau) {
    case "OK":
      return "HEALTHY";
    case "LET OP":
      return "DEGRADED";
    case "NIET GEMETEN":
      /* Niet gemeten is niet gezond. Er moet iemand gaan meten, dus:
         ACTION_REQUIRED. In een kritiek domein is het zwaarder — een
         back-up waarvan niemand weet of hij bestaat is net zo
         onbruikbaar als geen back-up. */
      return KRITIEKE_DOMEINEN.has(domein) ? "CRITICAL" : "ACTION_REQUIRED";
    case "FOUT":
      return KRITIEKE_DOMEINEN.has(domein) ? "CRITICAL" : "ACTION_REQUIRED";
  }
}

const ERNST_VAN_NIVEAU_UITLEG: Readonly<Record<Niveau, string>> = {
  OK: "gemeten en in orde",
  "LET OP": "werkt met beperking",
  FOUT: "gemeten en niet in orde",
  "NIET GEMETEN": "niet gemeten — dat is geen 'in orde'",
};

export function zwaarsteErnst(lijst: readonly Ernst[]): Ernst {
  return lijst.reduce<Ernst>(
    (a, b) => (ERNST_ORDE[b] > ERNST_ORDE[a] ? b : a),
    "HEALTHY",
  );
}

/**
 * Bouwt het rapport uit de ruwe signalen.
 *
 * Een domein zonder signalen komt er NIET als HEALTHY in: dan is er
 * niets over gemeten en dat hoort te blijken. Zo'n domein krijgt
 * ACTION_REQUIRED met de reden dat er geen meting is.
 */
export function bouwErnstRapport(signalen: readonly Signaal[]): ErnstRapport {
  const perDomein = new Map<Domein, Signaal[]>();
  for (const d of Object.keys(DOMEIN_LABEL) as Domein[]) perDomein.set(d, []);
  for (const s of signalen) perDomein.get(domeinVan(s.groep))!.push(s);

  const domeinen: DomeinUitslag[] = [];
  for (const [domein, eigen] of perDomein) {
    if (eigen.length === 0) {
      domeinen.push({
        domein,
        ernst: "ACTION_REQUIRED",
        signalen: [],
        aanvaard: 0,
        reden: "geen enkele meting voor dit domein — dat is niet hetzelfde als in orde",
      });
      continue;
    }
    const metErnst = eigen.map((s) => ({ s, e: ernstVan(s, domein) }));
    const ernst = zwaarsteErnst(metErnst.map((x) => x.e));
    const zwaarste = metErnst
      .filter((x) => x.e === ernst)
      .sort((a, b) => a.s.naam.localeCompare(b.s.naam))[0];
    domeinen.push({
      domein,
      ernst,
      signalen: eigen,
      aanvaard: eigen.filter((s) => s.aanvaard === true).length,
      reden:
        ernst === "HEALTHY"
          ? `${eigen.length} meting(en), alle in orde`
          : `${zwaarste!.s.naam}: ${zwaarste!.s.meting} (${ERNST_VAN_NIVEAU_UITLEG[zwaarste!.s.niveau]})`,
    });
  }

  domeinen.sort((a, b) => ERNST_ORDE[b.ernst] - ERNST_ORDE[a.ernst] || a.domein.localeCompare(b.domein));

  const totaal = zwaarsteErnst(domeinen.map((d) => d.ernst));
  const aanvaardTotaal = signalen.filter((s) => s.aanvaard === true).length;
  const nietGemeten = signalen.filter((s) => s.niveau === "NIET GEMETEN");

  const zwaar = domeinen.filter((d) => d.ernst === totaal).map((d) => DOMEIN_LABEL[d.domein]);
  const samenvatting =
    totaal === "HEALTHY"
      ? `alle ${domeinen.length} domeinen gemeten en in orde` +
        (aanvaardTotaal > 0 ? `, met ${aanvaardTotaal} aanvaarde beperking(en)` : "")
      : `${totaal} in ${zwaar.join(", ")}` +
        (aanvaardTotaal > 0
          ? `. Daarnaast ${aanvaardTotaal} aanvaarde beperking(en), die de totaalernst niet verhogen.`
          : "");

  return { totaal, domeinen, aanvaardTotaal, nietGemeten, samenvatting };
}
