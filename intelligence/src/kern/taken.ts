/* ============================================================
   KERN — het plan en het register van taaksoorten, op één plek
   ------------------------------------------------------------
   WAAROM DIT BESTAAND UIT ELKAAR GETROKKEN IS.

   Tot 3.0.4 stond het PLAN in cli/planner.ts en het REGISTER in
   cli/worker.ts. Beide bestanden zijn CLI's met top-level await, dus
   geen enkele toets kon ze importeren. Gevolg, gemeten op 078785a:

     PLAN     = ophalen, clusteren, beoordelen, regio, signaleren, backup
     REGISTER = dezelfde zes

   en de twee stappen die een gemeten feit tot een PAGINAREVISIE maken —
   `semantiek` en `voorstel` — stonden in geen van beide. Ze bestonden
   als npm-script en draaiden dus alleen met de hand. Het dashboard bleef
   daardoor op dezelfde (of nul) READY_FOR_REVIEW-rijen staan terwijl er
   wél nieuwe kandidaten binnenkwamen. Hetzelfde gold voor `gezondheid`:
   een compleet meetmodel met drempels, exitcodes en een meldlaag, dat
   door niets werd gestart.

   Door PLAN en REGISTER hier te zetten kan een toets ze naast elkaar
   leggen. Die toets staat in test/eenheid/taken.test.ts en is de
   grendel die dit defect niet opnieuw laat ontstaan: elke geplande
   soort MOET een handler hebben, en elke handler MOET gepland of
   expliciet handmatig zijn.

   IDEMPOTENTIE. De planner geeft elke taak een sleutel `soort:venster`,
   waarbij het venster het uur is (of de dag bij een dagelijkse taak).
   Een tweede plannerrun in hetzelfde venster plant daarom niets. Dat
   mechanisme bestond al; de nieuwe soorten gebruiken het ongewijzigd.
   ============================================================ */

import type { Pool } from "./db.ts";

export type PlanRegel = {
  readonly soort: string;
  readonly prioriteit: number;
  readonly toelichting: string;
  /** Eén keer per dag in plaats van per uur; zie de venstersleutel. */
  readonly dagelijks?: true;
  /**
   * Eén keer per week, op een vaste UTC-weekdag en vanaf een vast uur.
   *
   * Zelfde mechanisme als `dagelijks`, alleen grover: de
   * idempotentiesleutel draagt de DATUM van die ene weekdag, dus de
   * eerste plannerrun ná het uur maakt de taak aan en alle latere runs
   * van die dag slaan hem over.
   */
  readonly wekelijks?: {
    /** 0 = zondag, zoals Date#getUTCDay(). */
    readonly weekdagUtc: number;
    /** Vanaf dit UTC-uur mag hij gepland worden, niet eerder. */
    readonly vanafUurUtc: number;
  };
};

/**
 * Het venster van een wekelijkse planregel, of `null` als het nu niet
 * mag.
 *
 * Pure functie met opzet: of 'zondag 03:00 UTC' klopt, hoort toetsbaar
 * te zijn zonder planner en zonder database.
 *
 * DE SLEUTEL IS DE DATUM, NIET HET UUR. Was het uur de sleutel, dan zou
 * een planner die om 03:00 even niet draait de hele week overslaan. Nu
 * maakt de run van 04:00 de taak alsnog aan, onder dezelfde sleutel, en
 * maakt elke volgende run van die dag er géén tweede.
 *
 * WAT HIJ WÉL OVERSLAAT: een zondag waarop de planner de hele dag
 * stillag. Dat is aanvaard en niet gerepareerd, want de drempel waarop
 * het signaal reageert is 30 dagen — ruim vier weken. Eén gemiste week
 * raakt die grens niet, en een strakke uitvoering op de afgesproken dag
 * is te verkiezen boven een taak die op willekeurige dagen opduikt.
 */
export function wekelijksVenster(
  nu: Date,
  regel: NonNullable<PlanRegel["wekelijks"]>,
): string | null {
  if (nu.getUTCDay() !== regel.weekdagUtc) return null;
  if (nu.getUTCHours() < regel.vanafUurUtc) return null;
  return nu.toISOString().slice(0, 10);
}

/* De keten in de juiste orde. De prioriteit bepaalt welke taak een
   worker eerst pakt: ophalen voedt clusteren, clusteren voedt
   semantiek, semantiek voedt beoordelen, beoordelen voedt voorstel.
   Een lager getal gaat voor. */
/** `sleutel=aantal`, hoogste eerst; voor de trappen in de metinglogregel. */
function trapRegel(t: readonly { readonly sleutel: string; readonly aantal: number }[]): string {
  return t.map((x) => `${x.sleutel}=${x.aantal}`).join(" ") || "geen";
}

export const PLAN: readonly PlanRegel[] = [
  { soort: "ophalen", prioriteit: 10, toelichting: "alle actieve bronnen; de collector respecteert zelf elk bronninterval" },
  { soort: "clusteren", prioriteit: 20, toelichting: "nieuwe bronversies naar gebeurtenissen en uitspraken" },
  /* NIEUW IN 3.0.4. Moet ná clusteren (dat maakt de uitspraken) en vóór
     beoordelen, want de besluitmotor leest het verwoordbaarheidsoordeel
     dat hier wordt gezet. Zonder deze stap krijgt een nieuwe uitspraak
     nooit een oordeel en kan er dus nooit een feitelijke revisie uit
     komen. */
  { soort: "semantiek", prioriteit: 25, toelichting: "nieuwe uitspraken een semantiek- en verwoordbaarheidsoordeel geven" },
  { soort: "beoordelen", prioriteit: 30, toelichting: "de besluitmotor over nieuwe gebeurtenissen" },
  /* NIEUW IN R2. Moet ná beoordelen, en wel om een inhoudelijke reden:
     de nieuwsselectie leest `bedrijfsrelevantie` en `relevantie_categorie`
     die clusteren/semantiek hebben gezet, en toetst dezelfde drempels
     die de besluitmotor hanteert. Draaide hij ervoor, dan beoordeelde
     hij een stand die de rest van de ronde nog gaat veranderen.

     DIT IS GEEN TWEEDE BESLUITMOTOR. Hij schrijft onder zijn eigen
     motor_versie (nieuwsmotor-v1) en raakt de kandidaten van
     besluitmotor-v1 niet aan. Zie de kop van pijplijn/nieuwsselectie.ts
     voor waarom een nieuwsbericht een eigen besluit is: NEW_ARTICLE
     vereist dat GEEN pagina het cluster bezit, een nieuwsbericht
     vereist juist WEL een eigenaar om zijn intentie van te lenen.

     PUBLICEERT NIETS. De kandidaat komt op 'open' en wacht op een
     mens. */
  /* NIEUW IN R3 — de inhaalronde van de documentclassificatie.
     ------------------------------------------------------------------
     `clusteren` classificeert elke versie die hij langs ziet komen, dus
     nieuwe documenten zijn gedekt. Deze taak is er voor de twee gevallen
     die dat niet zijn:

       1. de versies die er al stonden toen R3 werd uitgerold — gemeten
          op 30 oktober 2026 waren dat 3.483 documentversies;
       2. de versies met een oordeel van een OUDERE motorversie. Gaat
          DOCUMENTSOORT_VERSIE omhoog, dan staan er twee generaties
          oordelen door elkaar en is een vergelijking tussen documenten
          niet eerlijk meer.

     Hij staat op 24, dus NA clusteren (20) en VOOR beoordelen (30): de
     besluitmotor hoort met geclassificeerde documenten te werken. */
  /* NIEUW IN R3. Staat op 22, dus ná clusteren (20) en documentclassificatie
     hieronder maar VOOR beoordelen (30) en nieuwsselectie (35). De orde is
     de hele veiligheid: de claimpoort weigert die twee lagen zolang er
     claims op herbeoordeling wachten, dus hij moet daarvoor klaar zijn. */
  { soort: "documentclassificatie", prioriteit: 21, toelichting: "documentversies zonder of met een verouderde soort classificeren" },
  { soort: "herbeoordeling", prioriteit: 22, toelichting: "historische claims wegen onder de huidige documentsoort- en modaliteitsregels" },
  { soort: "nieuwsselectie", prioriteit: 35, toelichting: "gebeurtenissen op nieuwswaarde wegen en NEWS_ITEM-kandidaten schrijven" },
  { soort: "regio", prioriteit: 40, toelichting: "gebieden binden en regiovoorstellen maken" },
  { soort: "signaleren", prioriteit: 50, toelichting: "commerciele signalen uit SALES_SIGNAL-kandidaten" },
  /* NIEUW IN 3.0.4. Moet ná beoordelen, want hij werkt de kandidaten af
     die de motor heeft geschreven. Publiceert niets: een voorstel komt
     in READY_FOR_REVIEW en wacht op een mens. */
  { soort: "voorstel", prioriteit: 60, toelichting: "kandidaten met een doelpagina naar wijzigingsvoorstellen" },
  /* DAGELIJKS, NIET PER UUR. De idempotentiesleutel van deze taak draagt
     alleen de DATUM, dus de eerste plannerrun van een dag maakt hem aan
     en de 23 runs daarna slaan hem over — precies hetzelfde mechanisme
     dat een dubbele plannerrun al onschadelijk maakt, nu met een grover
     venster. Een uurlijkse back-up van een database die één keer per uur
     een handvol rijen bijschrijft is verspilling; een dagelijkse haalt
     de RPO van 24 uur die het runbook vastlegt.
     Prioriteit 90: de back-up gaat ná de keten, zodat hij de staat van
     die dag meeneemt in plaats van die van gisteren. */
  { soort: "backup", prioriteit: 90, dagelijks: true, toelichting: "logische back-up plus externe kopie in de bucket" },
  /* NIEUW IN 3.0.4, en als laatste: de gezondheidsmeting kijkt naar de
     uitkomst van alles hierboven, inclusief de leeftijd van de back-up.
     Uurlijks, want een storing die 24 uur onopgemerkt blijft is geen
     monitoring. */
  { soort: "gezondheid", prioriteit: 95, toelichting: "het volledige gezondheidsmodel meten en meldingen bijwerken" },
  /* NIEUW IN 3.0.4, en de reden is praktisch: de productiedatabase is
     privé-only (postgres.railway.internal) en `railway connect` eist een
     SSH-sleutel. Daardoor waren de redactionele tellingen, de 0027-stand
     en het aantal foutteksten met een credential van buiten NIET te
     meten — en dus werden ze geschat of overgeslagen.

     Deze taak draait IN Railway en zet de getallen via de
     structuurlogger op stdout, waar het Railway-log ze oppikt. Dagelijks:
     deze cijfers bewegen niet per uur, en een dagelijkse regel is
     makkelijker terug te vinden dan 24. Strikt alleen-lezen. */
  { soort: "meting", prioriteit: 96, dagelijks: true, toelichting: "de redactionele en databasestand meten en in het log zetten" },
  /* NIEUW IN R2, DAGELIJKS — en dit is de taak die een TREND mogelijk
     maakt in plaats van hem te berekenen.

     Het indexatierapport (analytics/koppelingen.ts, tien metrieken met
     MEASURED/INFERRED/UNVERIFIED/NOT_AVAILABLE) bestond volledig, en
     `bewaarDagstand()` schrijft hem naar intel.indexatie_dagstand
     (migratie 0034). Maar `--bewaar` stond in GEEN enkele planregel.
     Gemeten: intel.indexatie_dagstand heeft 0 rijen.

     Dat is geen ontbrekende functie maar een ontbrekende CADANS.
     intel.indexatie_status heeft `unique (organisatie_id, url, bron)`
     en zet bij een upsert `laatst_gecontroleerd_op = now()` — het
     vorige meetpunt wordt dus gewist. Zonder dagstand is een
     vergelijking over 7, 28 of 90 dagen PER CONSTRUCTIE onmogelijk,
     hoe goed de query ook is. Twee dagstanden zijn een trend; één rij
     die zichzelf overschrijft is dat nooit.

     DAGELIJKS en niet uurlijks: de dagstand draagt een DATUM in zijn
     unieke sleutel, dus een tweede run op dezelfde dag overschrijft de
     stand van die dag in plaats van een tweede punt te maken. Uurlijks
     plannen zou 23 nutteloze runs opleveren.

     GEEN CREDENTIAL NODIG. Deze taak meet uitsluitend wat van hier te
     meten is: het routeregister, de sitemap en de eigen HTTP-meting.
     De GSC-metrieken blijven NOT_AVAILABLE met hun reden — dat is de
     eerlijke uitkomst en geen fout. */
  { soort: "indexatie", prioriteit: 97, dagelijks: true, toelichting: "de indexatiedagstand vastleggen, zodat er een trend kan ontstaan" },
  /* WEKELIJKS, ZONDAG 03:00 UTC — de enige taak met die cadans.
     Waarom niet dagelijks: een restoretest zet een volledige dump terug
     in een verse wegwerpdatabase op de productieSERVER. Dat is zwaarder
     dan al het andere hier en het antwoord verandert niet van dag tot
     dag. De drempel waarop het signaal reageert is 30 dagen, dus
     wekelijks geeft vier kansen binnen één drempel: één gemiste week
     kan het bewijs nooit laten verlopen.

     Waarom zondag 03:00 en niet een werkdag: de dagelijkse back-up
     loopt om 00:00 UTC, dus om 03:00 is de dump van die nacht er zeker
     en is hij nog vers. En een zondagnacht is het moment waarop een
     tijdelijke database op de productieserver de minste andere
     activiteit raakt.

     Prioriteit 99: na alles. De restoretest voegt niets toe aan de
     keten van die ronde en mag er nooit vóór komen. */
  {
    soort: "restoretestronde",
    prioriteit: 99,
    wekelijks: { weekdagUtc: 0, vanafUurUtc: 3 },
    toelichting: "de back-up aantoonbaar terugzetten in een geisoleerde wegwerpdatabase",
  },
  /* WEKELIJKS, MAANDAG 06:00 UTC — de operationele rapportage uit §13.
     Maandagochtend en niet zondagnacht: dit rapport is voor een MENS,
     en een redactie leest hem aan het begin van de week waarin ze
     beslist. De restoretest staat op zondag 03:00 omdat die juist
     niemand hoort te storen; dat is het omgekeerde criterium.
     Prioriteit 98: ná de dagelijkse meting en indexatiedagstand, zodat
     hij de stand van die ronde meeneemt, maar vóór de restoretest die
     niets aan de cijfers toevoegt. */
  {
    soort: "weekrapport",
    prioriteit: 98,
    wekelijks: { weekdagUtc: 1, vanafUurUtc: 6 },
    toelichting: "de tien operationele cijfers van de afgelopen week in het log zetten",
  },
];

export type Handler = (
  pool: Pool,
  organisatieId: number,
  payload: Record<string, unknown>,
) => Promise<string>;

const tekstOf = (p: Record<string, unknown>, k: string): string | undefined =>
  typeof p[k] === "string" ? (p[k] as string) : undefined;

/* ------------------------------------------------------------
   Het register.
   ------------------------------------------------------------
   Elke soort wijst naar een bestaande, al geteste stap. De worker is
   een uitvoerder en geen tweede implementatie: zou hij de logica
   dupliceren, dan bestaan er twee waarheden over wat "ophalen" doet.
   Alle imports zijn dynamisch, zodat deze module geen importcyclus
   maakt met de lagen die hij aanroept.
   ------------------------------------------------------------ */
export const REGISTER: Record<string, Handler> = {
  async ophalen(pool, organisatieId, payload) {
    const { verzamel, beoordeelOphaalronde } = await import("../pijplijn/verzamelen.ts");
    const r = await verzamel(pool, organisatieId, {
      alleenBron: tekstOf(payload, "bron"),
      forceer: payload["forceer"] === true,
    });

    /* De beslisregel staat als pure functie in verzamelen.ts, zodat hij
       zonder database te toetsen is. Werpen betekent: via de normale
       backoff opnieuw, en bij uitputting naar de dlq. Dat is precies de
       zichtbaarheid die ontbrak toen een ronde met 29 gefaalde bronnen
       nog GEREED meldde. */
    const uitkomst = beoordeelOphaalronde(r);
    if (!uitkomst.geslaagd) {
      const { IntelFout } = await import("./fouten.ts");
      throw new IntelFout("netwerk", uitkomst.melding, {
        herhaalbaar: true,
        context: {
          bronnen_geprobeerd: r.bronnenGeprobeerd,
          bronnen_fout: r.bronnenFout,
          bronnen_overgeslagen: r.bronnenOvergeslagen,
        },
      });
    }
    return uitkomst.melding;
  },

  async clusteren(pool, organisatieId) {
    const { clusterNieuweVersies } = await import("../pijplijn/clusteren.ts");
    const r = await clusterNieuweVersies(pool, organisatieId, {});
    return `versies ${r.versiesBekeken}, gebeurtenissen ${r.gebeurtenissenNieuw}, uitspraken ${r.uitsprakenAangemaakt}`;
  },

  /**
   * NIEUW IN 3.0.4 — de semantische verificatie in de keten.
   *
   * Werkt op BEWAARDE uitspraken, niet op fixtures: backfillSemantiek
   * leest de opgeslagen bronzin, leidt de semantiek af en laat de
   * verwoordbaarheidspoort beslissen. Hervatbaar via vanafId, dus een
   * worker die halverwege omvalt begint niet opnieuw vooraan.
   *
   * SCHAALCORRECTIE WORDT GEDETECTEERD, NIET TOEGEPAST. herstelSchaal
   * kan een correctie append-only aanbrengen, maar dat verandert een
   * FEITELIJKE waarde. Dat hoort een mens te doen (npm run
   * schaalcorrectie -- --toepassen). Deze taak meet alleen hoeveel er
   * open staan, zodat het niet onzichtbaar blijft.
   */
  async semantiek(pool, organisatieId, payload) {
    const { backfillSemantiek } = await import("../pijplijn/semantiekopslag.ts");
    const { herstelSchaal } = await import("../pijplijn/schaalcorrectie.ts");

    const perBatch = 500;
    const maxRondes = 40;
    let vanafId = 0;
    let bekeken = 0;
    let verrijkt = 0;
    let zonderUitdrukking = 0;
    let rondes = 0;

    while (rondes < maxRondes) {
      const r = await backfillSemantiek(pool, organisatieId, {
        vanafId,
        max: perBatch,
        alles: payload["alles"] === true,
      });
      rondes += 1;
      bekeken += r.bekeken;
      verrijkt += r.verrijkt;
      zonderUitdrukking += r.zonderUitdrukking;
      if (r.bekeken === 0 || r.laatsteId <= vanafId) break;
      vanafId = r.laatsteId;
    }

    /* DROOG, EN DAT BLIJFT ZO.
       Een schaalcorrectie verandert een BEWAARD FEIT. Dat de keten
       append-only is -- een nieuwe uitspraak met de volle waarde, een
       correctieregel naar de oude, niets ge-update en niets verwijderd
       -- maakt het navraagbaar, maar nog geen handeling die een
       geplande taak ongevraagd hoort te doen. De planner meet; een mens
       besluit. */
    const schaal = await herstelSchaal(pool, organisatieId, { toepassen: false });

    /* EN WELKE VIER. Gemeten op productie (taak 429, 13 oktober 2026
       16:02Z): "openstaande schaalcorrecties 4", zonder één aanwijzing
       welke. Om ze na te trekken was databasetoegang nodig, en die
       bestaat met opzet niet -- dus stonden ze eindeloos open.

       Het bewijs per regel is wat het navraagbaar maakt: het
       schaalwoord stond DIRECT naast het getal (daar is
       vindSchaalverlies streng in, anders corrigeert hij een percentage
       in een zin die over miljarden gaat), en `vindplaats` is het
       letterlijke bronfragment. Dat hoort in de regel, niet in een
       tabel die niemand kan lezen. */
    /* WAT ERBIJ IS GEKOMEN IN 3.0.7, en waarom elk veld.

       `bewijsklasse` — alleen GEZAGHEBBEND wordt ooit toegepast; zonder
       dit veld is van buiten niet te zien welke regels geblokkeerd
       staan en welke op een mens wachten.

       `gebeurtenis` — uitspraak 12 en 13 op productie hebben IDENTIEKE
       tekst (zelfde zin, waarden 235 en 33). Zonder het gebeurtenis-id
       zijn twee regels met hetzelfde fragment nauwelijks te scheiden.

       `horizon`/`periode` — de tijdgrens bepaalt of een bedrag een
       jaarbedrag of een meerjarenopgave is, en dat is criterium d van
       het bewijsoordeel. Het stond in `regels` maar niet in het log. */
    const schaalDetail =
      schaal.regels.length > 0
        ? `; geblokkeerd ${schaal.geblokkeerd}; te besluiten: ` +
          schaal.regels
            .slice(0, 6)
            .map(
              (r) =>
                `uitspraak ${r.uitspraakId}/gebeurtenis ${r.gebeurtenisId ?? "-"} ` +
                `${r.oudeWaarde}->${r.nieuweWaarde}${r.eenheid ? ` ${r.eenheid}` : ""} ` +
                `[${r.bewijsklasse}]` +
                `${r.horizon ? ` horizon '${r.horizon}'` : r.periode ? ` periode '${r.periode}'` : " GEEN TIJDGRENS"}` +
                ` (${r.schaalwoord}: "${r.vindplaats.slice(0, 70)}")` +
                (r.bewijsklasse === "ONZEKER" ? ` — ${r.bewijsredenen.join(" | ").slice(0, 160)}` : ""),
            )
            .join(" ;; ") +
          (schaal.regels.length > 6 ? ` ;; +${schaal.regels.length - 6} meer` : "")
        : "";

    return (
      `bekeken ${bekeken}, verrijkt ${verrijkt}, zonder uitdrukking ${zonderUitdrukking}, ` +
      `rondes ${rondes}, openstaande schaalcorrecties ${schaal.gevonden}${schaalDetail}`
    );
  },

  /**
   * R3 — DE CLAIMPOORT STAAT HIERVOOR.
   *
   * De besluitmotor weegt bewijs: `uitspraken_bevestigd > 0` is zijn
   * enige bewijsvoorwaarde (motor.ts regel 233) en
   * `besteBewijskwaliteit >= 4` zijn NEW_ARTICLE-poort (regel 268).
   * Beide lezen kolommen die vóór de herbeoordeling de OUDE waarde
   * dragen, waarin de bewijskracht van de uitgever kwam. Draaien op een
   * gemengde populatie zou een lobbyclaim als bewijs laten tellen.
   */
  async beoordelen(pool, organisatieId) {
    const { neemBesluiten } = await import("../besluit/motor.ts");
    const { eisHerbeoordeling } = await import("../pijplijn/claimpoort.ts");
    const { metOrganisatie } = await import("./db.ts");
    await metOrganisatie(pool, { organisatieId }, (c) =>
      eisHerbeoordeling(c, organisatieId, "de besluitmotor"),
    );
    const r = await neemBesluiten(pool, organisatieId, {});
    return `beoordeeld ${r.beoordeeld}, kandidaten ${r.kandidatenGeschreven}`;
  },

  /**
   * NIEUW IN R3 — de historische claims herbeoordelen.
   *
   * SCHRIJFT ALLEEN OP intel.uitspraken, en legt elke wijziging vast in
   * het append-only auditlogboek. Hij raakt geen koppeling, geen
   * gebeurtenis, geen kandidaat en geen concept aan.
   *
   * STAAT OP PRIORITEIT 22: ná de documentclassificatie (24 zou te laat
   * zijn — hij heeft de documentsoort nodig) maar vóór beoordelen (30)
   * en nieuwsselectie (35), de twee lagen die de claimpoort passeren.
   * Zo is de populatie al schoon voordat er iets besloten wordt.
   */
  async herbeoordeling(pool, organisatieId) {
    const { herbeoordeelClaims } = await import("../pijplijn/herbeoordeling.ts");
    const { metOrganisatie } = await import("./db.ts");
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      herbeoordeelClaims(c, organisatieId, {}),
    );
    return (
      `bekeken ${r.bekeken}, herbeoordeeld ${r.herbeoordeeld}, ` +
      `bevestiging behouden ${r.bevestigingBehouden}, ingetrokken ${r.bevestigingIngetrokken}, ` +
      `bewijskracht verlaagd ${r.bewijskrachtVerlaagd}` +
      (r.menselijkOvergeslagen > 0 ? `, menselijk oordeel overgeslagen ${r.menselijkOvergeslagen}` : "") +
      (r.getroffenGebeurtenissen.length > 0
        ? ` — ${r.getroffenGebeurtenissen.length} gebeurtenis(sen) geraakt`
        : "")
    );
  },

  /**
   * NIEUW IN R3 — de documentclassificatie inhalen.
   *
   * SCHRIJFT ALLEEN OP brondocument_versies, en alleen de zes
   * classificatiekolommen. Hij raakt geen claim, geen gebeurtenis en
   * geen kandidaat: een herclassificatie verandert wat we van een
   * document WETEN, niet wat er eerder mee is gebeurd.
   *
   * IDEMPOTENT. `bepaalDocumentsoort()` is puur en de versietekst is
   * onveranderlijk (versies_hash_uniek), dus twee rondes geven hetzelfde
   * resultaat. De query pakt alleen rijen zonder soort of met een andere
   * motorversie, dus een derde ronde doet niets meer.
   */
  async documentclassificatie(pool, organisatieId) {
    const { haalClassificatieIn } = await import("../pijplijn/documentclassificatie.ts");
    const { DOCUMENTSOORT_VERSIE } = await import("../pijplijn/documentsoort.ts");
    const { metOrganisatie } = await import("./db.ts");

    const { verifieerNavertellingen } = await import("../pijplijn/bronverificatie.ts");

    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      haalClassificatieIn(c, organisatieId, { huidigeVersie: DOCUMENTSOORT_VERSIE }),
    );

    /* DE VERIFICATIE DRAAIT NÁ DE CLASSIFICATIE, in dezelfde taak.
       Hij heeft `beschrijft_besluit_van` nodig, en dat veld komt uit de
       classificatie. Twee taken zou een venster openen waarin de ene al
       wel en de andere nog niet is gedraaid; dan zou de uitslag van de
       verificatie van de planningsorde afhangen. */
    const v = await metOrganisatie(pool, { organisatieId }, (c) =>
      verifieerNavertellingen(c, organisatieId, {}),
    );

    /* DE VERDELING IN DE UITKOMSTREGEL. Een telling zonder verdeling
       zegt op productie niets: 2.000 geclassificeerd kan betekenen dat
       het goed gaat of dat alles in één soort valt. De drie zwaarste
       soorten passen in een regel. */
    const top = Object.entries(r.perSoort)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s, n]) => `${n}x ${s}`)
      .join(" ;; ");

    return (
      `motor ${DOCUMENTSOORT_VERSIE} — bekeken ${r.bekeken}, geclassificeerd ${r.geclassificeerd}` +
      (top ? ` — ${top}` : "") +
      ` — bronverificatie: ${v.teruggevonden} teruggevonden, ${v.ambigu} ambigu, ` +
      `${v.nietTeruggevonden} niet teruggevonden, ${v.nietVanToepassing} n.v.t.`
    );
  },

  /**
   * NIEUW IN R2 — de nieuwsselectie in de keten.
   *
   * DE SITECONTEXT IS EEN VOORWAARDE, net als bij `voorstel`. Zonder
   * sitecontext kan deze laag niet vaststellen of een cluster een
   * eigenaar heeft die op INDEX staat, en dat is precies de grond die
   * weigerNieuws() straks toetst. Zou hij dan doorgaan, dan schreef hij
   * kandidaten die niemand kan publiceren.
   *
   * R2.1 — WAAROM DEZE POORT IS VERSCHOVEN. Hij toetste
   * `registerAanwezig && statenAanwezig`, dus de aanwezigheid van twee
   * BESTANDEN uit de repo-wortel. Die staan niet in de productiecontainer
   * (`rootDirectory: intelligence`, dus `/app` IS die map), terwijl het
   * gecommitte sitekennisartefact er wél staat en dezelfde vraag kan
   * beantwoorden. Gemeten gevolg: deze taak zou in productie ALTIJD
   * falen op een configuratiefout, ook met een geldige context op schijf.
   *
   * De poort toetst nu de TOESTAND en niet de vindplaats. Alleen
   * CONTEXT_NIET_BESCHIKBAAR is een storing;
   * GELDIGE_CONTEXT_ZONDER_EIGENAARS is een uitkomst en mag doorgaan,
   * want "deze clusters hebben werkelijk geen eigenaar" is iets anders
   * dan "ik kan de site niet zien". Een onbruikbare context blijft een
   * configuratiefout en dus niet-herhaalbaar: opnieuw proberen leest
   * hetzelfde bestand.
   *
   * SCHRIJFT GEEN CONCEPT EN KEURT NIETS GOED. Deze taak levert een
   * geordende werkvoorraad; `maakConcept` is een aparte stap en zet een
   * inhoudsversie op 'ter_review'.
   */
  async nieuwsselectie(pool, organisatieId, payload) {
    const { leesNieuwsContext } = await import("../site/nieuwscontext.ts");
    const { nieuwsselectieronde } = await import("../pijplijn/nieuwsselectie.ts");
    const { configLezen } = await import("./config.ts");
    const { IntelFout } = await import("./fouten.ts");

    const { eisHerbeoordeling } = await import("../pijplijn/claimpoort.ts");
    const { metOrganisatie } = await import("./db.ts");
    /* R3 — dezelfde grendel als bij de besluitmotor, en om dezelfde
       reden: deze laag telt bevestigde uitspraken en leest de beste
       bewijskwaliteit. Op een gemengde populatie zijn die twee getallen
       geen bewijs maar een restant van de oude regel. */
    await metOrganisatie(pool, { organisatieId }, (c) =>
      eisHerbeoordeling(c, organisatieId, "de nieuwsselectie"),
    );

    const config = configLezen();
    const ctx = await leesNieuwsContext(config.siteWortel);

    if (ctx.toestand === "CONTEXT_NIET_BESCHIKBAAR") {
      throw new IntelFout(
        "configuratie",
        `nieuwscontext NIET BESCHIKBAAR (${ctx.herkomst.onbruikbaarSoort}): ` +
          `${ctx.herkomst.onbruikbaarReden} — ${ctx.herkomst.bronReden}. ` +
          "Er zijn GEEN kandidaten beoordeeld en geen bestaande gewijzigd.",
        { herhaalbaar: false },
      );
    }

    const r = await nieuwsselectieronde(pool, organisatieId, {
      eigenaren: ctx.eigenaren,
      bronsoortPerSleutel: ctx.bronsoortPerSleutel,
      bestaandeNieuwsSlugs: ctx.bestaandeNieuwsSlugs,
      ...(tekstOf(payload, "vandaag") ? { vandaag: tekstOf(payload, "vandaag")! } : {}),
    });

    /* DE AFWIJSGRONDEN IN DE LOGREGEL, en dat is dezelfde les als bij
       `gezondheid` en `semantiek`: een telling zonder reden is op
       productie niet na te trekken, want de database is privaat. De
       drie zwaarste gronden passen in een regel en zeggen wat eraan te
       doen is. */
    const gronden = Object.entries(r.perAfwijsgrond)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g, n]) => `${n}x ${g}`)
      .join(" ;; ");

    /* DE HERKOMST IN DE UITKOMSTREGEL. Een nul zonder herkomst is op
       productie niet te wegen: hij kan betekenen dat de oogst klein was
       of dat de context uit een ondergrens kwam. `intel.taken.resultaat`
       is de enige plek waar een mens dat later terugvindt. */
    return (
      `context ${ctx.toestand} via ${ctx.herkomst.bron} ` +
      `(${ctx.herkomst.clustersMetEigenaar} cluster(s) met eigenaar) — ` +
      `beoordeeld ${r.beoordeeld}, geschikt ${r.geschikt}, ongeschikt ${r.ongeschikt}, ` +
      `geschreven ${r.kandidatenGeschreven}` +
      (gronden ? ` — zwaarste gronden: ${gronden}` : "") +
      (r.top.length ? ` — hoogste: ${r.top[0]!.score}/100 g${r.top[0]!.gebeurtenisId}` : "")
    );
  },

  async regio(pool, organisatieId) {
    const { bouwRegioImpacts } = await import("../regio/impacts.ts");
    const r = await bouwRegioImpacts(pool, organisatieId, {});
    return `gebonden ${r.gebiedenGebonden}, voorstellen ${r.impactsNieuw}`;
  },

  async signaleren(pool, organisatieId) {
    const { maakSignalen } = await import("../commercieel/signalen.ts");
    const r = await maakSignalen(pool, organisatieId, {});
    return `signalen nieuw ${r.signalenNieuw}, bijgewerkt ${r.signalenBijgewerkt}`;
  },

  /**
   * NIEUW IN 3.0.4 — voorstelgeneratie in de keten.
   *
   * HET ARTEFACT IS EEN VOORWAARDE, GEEN GEMAK. Zonder sitekennis kan
   * deze laag niet beoordelen of een pagina een onderwerp dekt, en dan
   * hoort hij te WEIGEREN in plaats van alles met een leeg voorbehoud
   * door te laten. Een ontbrekend artefact is een configuratiefout en
   * dus niet-herhaalbaar: opnieuw proberen levert hetzelfde op.
   *
   * PUBLICEERT NIETS. Een voorstel komt in READY_FOR_REVIEW en wacht op
   * een mens. Bestaande menselijke besluiten blijven staan zolang de
   * inhoudshash gelijk is; zie bewaarVoorstel.
   */
  async voorstel(pool, organisatieId, payload) {
    const { leesSitekennis } = await import("../site/sitekennis.ts");
    const { voorstelronde } = await import("../inhoud/voorstel.ts");
    const { APP_WORTEL } = await import("./config.ts");
    const { IntelFout } = await import("./fouten.ts");

    /* R3 — de voorstellenlaag leest verificatie_status als bewijssignaal
       (voorstel.ts regel 526: 'alle bevestigd' geeft PASS op controle 1),
       dus ook hier geldt de claimpoort. */
    const { eisHerbeoordeling } = await import("../pijplijn/claimpoort.ts");
    const { metOrganisatie: metOrg } = await import("./db.ts");
    await metOrg(pool, { organisatieId }, (c) =>
      eisHerbeoordeling(c, organisatieId, "de voorstellenlaag"),
    );

    const uitslag = await leesSitekennis(APP_WORTEL);
    if (!uitslag.ok) {
      throw new IntelFout(
        "configuratie",
        `sitekennis onbruikbaar (${uitslag.fout.soort}): ${uitslag.fout.bericht}. ` +
          `Er zijn GEEN voorstellen gemaakt en geen bestaande voorstellen gewijzigd.`,
        { herhaalbaar: false },
      );
    }

    const r = await voorstelronde(pool, organisatieId, uitslag.kennis, {
      vandaag: tekstOf(payload, "vandaag"),
    });
    const oordelen = Object.entries(r.perEindoordeel)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    return (
      `kandidaten ${r.kandidaten}, gebouwd ${r.gebouwd}, nieuw ${r.nieuw}, ` +
      `bijgewerkt ${r.bijgewerkt}, zonder voorstel ${r.zonderVoorstel}` +
      (oordelen ? ` — ${oordelen}` : "")
    );
  },

  /**
   * De dagelijkse back-up, met de externe kopie erbij.
   *
   * DEZE TAAK DRAAIT ALS OPERATOR EN NIET ALS APPLICATIEROL. De
   * applicatierol mag intel.migraties niet lezen en bezit niets — dat
   * is het hele punt van die rol — en pg_dump heeft die leesrechten
   * nodig. Daarom een eigen pool zonder SET ROLE, net als de
   * back-up-CLI doet.
   *
   * DE TAAK FAALT ALS DE EXTERNE KOPIE NIET LUKT. Dat is bewust: een
   * back-up die alleen op de containerschijf staat, is op Railway na de
   * volgende deploy weg. Zou deze taak dan 'gereed' melden, dan zou de
   * wachtrij succes rapporteren voor iets dat geen retentie oplevert.
   */
  async backup(_pool, organisatieId, payload) {
    const [{ maakBackup, KRITIEKE_TABELLEN }, { gcsConfigUitOmgeving, uploadNaarGcs, lijstGcs }, { readFile }, { basename, join }, { APP_WORTEL, configLezen }] =
      await Promise.all([
        import("../ops/backup.ts"),
        import("../ops/gcsopslag.ts"),
        import("node:fs/promises"),
        import("node:path"),
        import("./config.ts"),
      ]);
    const { maakPool: maakEigenPool, zonderOrganisatie, rijen: leesRijen } = await import("./db.ts");
    const config = configLezen();

    /* ---- IDEMPOTENT PER KALENDERDAG, MAAR NIET TEN KOSTE VAN HERSTEL ----
       Een herstart tijdens een lopende back-up legt de taak terug
       (geefVerlopenTerug, alleen bij het OPSTARTEN van een worker) en
       dan maakt deze handler een tweede dump met een tweede tijdstempel
       in de naam. De wachtrij voorkomt dat niet: de idempotentiesleutel
       verhindert een tweede RIJ, niet een tweede UITVOERING. En een
       lease-afloopcyclus omzeilt `max_pogingen` en de dlq volledig,
       want die worden alleen gelezen als de handler WERPT.

       Daarom de vraag die telt: ligt er voor deze KALENDERDAG al een
       dump MET manifest? Zo ja, dan is de back-up af. Ligt er een dump
       ZONDER manifest, dan is een eerdere poging halverwege afgebroken
       en is wat er ligt geen back-up — dan moet deze poging juist wél
       doorgaan. Zie backupStandVoorPeriode() in ops/restorebewijs.ts.

       GEMETEN: exact drie back-uptaken, een per dag, alle met
       pogingen = 1. De wachtrij heeft dit nooit gedaan; het mechanisme
       is echt en de gebeurtenis niet aangetoond.

       `forceer` is de ontsnappingsklep, zoals bij de ophaalhandler: een
       door een mens geduwde taak is onblokkeerbaar. Zonder bucket valt
       hij terug op het oude gedrag — altijd maken — en dat is ook het
       pad van `npm run backup` met de hand. */
    const periode = String(payload["venster"] ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const gcsVooraf = gcsConfigUitOmgeving();
    if (gcsVooraf && payload["forceer"] !== true) {
      const { backupStandVoorPeriode } = await import("../ops/restorebewijs.ts");
      const stand = backupStandVoorPeriode(
        await lijstGcs(gcsVooraf, "vibe-intel-").catch(() => []),
        periode,
      );
      if (stand.alAf) return `overgeslagen: ${stand.grond}`;
      if (stand.halfAfgebroken.length > 0) {
        const { maakLogger } = await import("./log.ts");
        maakLogger("taak:backup").waarschuwing("back-up wordt opnieuw gemaakt", {
          periode,
          grond: stand.grond.slice(0, 200),
          half_afgebroken: stand.halfAfgebroken.length,
        });
      }
    }

    const eigenaarPool = maakEigenPool({ rol: null, max: 2 });
    const info = await zonderOrganisatie(eigenaarPool, (c) =>
      leesRijen<{ versie: string; naam: string; migraties: number }>(
        c,
        `select current_setting('server_version') as versie,
                current_database()                as naam,
                (select count(*)::int from intel.migraties) as migraties`,
      ),
    );
    const meta = info[0];
    if (!meta) throw new Error("kon de databasegegevens niet lezen voor de back-up");

    const tellingen: Record<string, number> = {};
    for (const tabel of KRITIEKE_TABELLEN) {
      const r = await zonderOrganisatie(eigenaarPool, (c) =>
        leesRijen<{ n: number }>(c, `select count(*)::int as n from ${tabel}`),
      );
      tellingen[tabel] = r[0]?.n ?? 0;
    }

    const doelmap = join(APP_WORTEL, "backups");
    const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const uit = await maakBackup({
      databaseUrl: config.databaseUrl,
      doelmap,
      stempel,
      retentieDagen: 30,
      tellingen,
      serverVersie: meta.versie,
      migraties: meta.migraties,
      databaseNaam: meta.naam,
    });

    const gcs = gcsConfigUitOmgeving();
    if (!gcs) {
      throw new Error(
        "back-up gemaakt maar er is GEEN externe bestemming (INTEL_GCS_BUCKET/INTEL_GCS_SLEUTEL). " +
          "Op een ephemere schijf is dat geen retentie; deze taak faalt daarom bewust.",
      );
    }
    const dumpNaam = basename(uit.dumpPad);
    const o = await uploadNaarGcs(
      gcs,
      dumpNaam,
      await readFile(uit.dumpPad),
      "application/octet-stream",
    );
    await uploadNaarGcs(
      gcs,
      `${dumpNaam}.manifest.json`,
      await readFile(`${uit.dumpPad}.manifest.json`),
      "application/json",
    );
    if (o.sha256 !== uit.manifest.sha256) {
      throw new Error(`de kopie in gs://${gcs.bucket} wijkt af van het manifest`);
    }
    void organisatieId;
    return (
      `dump ${Math.round(uit.manifest.bytes / 1024)} kB, ${uit.manifest.migraties} migraties, ` +
      `extern in gs://${gcs.bucket} (sha ${o.sha256.slice(0, 12)})`
    );
  },

  /**
   * NIEUW IN 3.0.4 — het gezondheidsmodel op een schema.
   *
   * Het model bestond volledig (ops/gezondheid.ts met drempels,
   * ops/ernst.ts met domeinen, ops/melden.ts met een meldlaag) maar
   * werd door NIETS gestart: geen cron, geen taaksoort, geen
   * schedule-trigger in CI. Exitcodes en de webhook waren daarmee
   * ongebruikte mechaniek.
   *
   * EEN SLECHTE UITSLAG LAAT DEZE TAAK NIET FALEN. Dat is bewust: de
   * taak is de METING, en een falende taak zou via de backoff eindeloos
   * opnieuw meten en de dlq vullen. De bevindingen landen in
   * intel.meldingen (en in het dashboard) via meldRonde; dat is de plek
   * waar een mens ze ziet. Faalt het MÉTEN zelf, dan werpt hij wel.
   *
   * Eigen eigenaarspool: het model leest intel.migraties, en de
   * applicatierol mag dat niet. Zelfde patroon als de back-uptaak.
   */
  async gezondheid(_pool, organisatieId) {
    const [{ meetGezondheid, zwaarste }, { meldRonde }, { bouwErnstRapport }, { join }, { APP_WORTEL }] =
      await Promise.all([
        import("../ops/gezondheid.ts"),
        import("../ops/melden.ts"),
        import("../ops/ernst.ts"),
        import("node:path"),
        import("./config.ts"),
      ]);
    const { maakPool: maakEigenPool, metOrganisatie: metOrg } = await import("./db.ts");

    const eigenaarPool = maakEigenPool({ rol: null, max: 2 });
    const signalen = await metOrg(eigenaarPool, { organisatieId }, (c) =>
      meetGezondheid(c, organisatieId, { backupMap: join(APP_WORTEL, "backups") }),
    );
    const totaal = zwaarste(signalen);
    const ernst = bouwErnstRapport(signalen);
    const meld = await metOrg(eigenaarPool, { organisatieId }, (c) =>
      meldRonde(c, organisatieId, signalen),
    );

    /* DE E-MAILKETEN, NA DE STAAT EN NIET ERVOOR.
       meldRonde() heeft hierboven vastgesteld WELKE storingen lopen en
       welke net dicht zijn. Pas daarna is er iets te melden. De twee
       stappen staan apart zodat een fout in het mailen de
       staatsregistratie niet kan beschadigen: de meldingen staan dan al
       in de database.

       verrijkMeldingen() zet de bundel en de ernst op de open rijen —
       de brug tussen het signaal (dat de bundel kent) en de rij (die hem
       moet bewaren). */
    const { verrijkMeldingen, meldmailRonde } = await import("../ops/meldmail.ts");
    const mail = await metOrg(eigenaarPool, { organisatieId }, async (c) => {
      await verrijkMeldingen(c, organisatieId, signalen);
      return meldmailRonde(c, organisatieId);
    });

    const perNiveau: Record<string, number> = {};
    for (const s of signalen) perNiveau[s.niveau] = (perNiveau[s.niveau] ?? 0) + 1;
    const uitsplitsing = Object.entries(perNiveau)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");

    /* WELKE signalen niet OK zijn, niet alleen HOEVEEL.
       Deze melding zei "FOUT 2, NIET GEMETEN 5" en daarmee was in het
       Railway-log niet te zien WAT er stuk was. Precies dat liep ik zelf
       tegen het lijf bij de uitrol van 3.0.5: het aantal FOUT ging van 1
       naar 2 en de enige manier om te achterhalen welke dat waren, was
       databasetoegang — die er met opzet niet is. Een
       gezondheidsmelding die je moet natrekken in een systeem waar je
       niet bij kunt, is geen monitoring.

       De `aanvaard`-vlag gaat mee, zodat een bekende grens niet als
       nieuw probleem leest. */
    /* EN BIJ EEN FOUT OOK DE MÉTING ERACHTER.
       Gemeten op productie, 13 oktober 2026 16:02Z (taak 435): de regel
       noemde drie FOUT-signalen in de groep `ingestie`, en geen ervan
       was uitvoerbaar. "storingssoort TOEGANG_BEPERKT=FOUT" zegt dat er
       een toegangsbeperkte bron nog ACTIEF staat — maar niet wélke, en
       dus kan niemand hem uitzetten zonder databasetoegang. Die toegang
       bestaat met opzet niet.

       De meting van juist die signalen draagt de bronsleutels al
       (`sleutels` in de query hierboven). Alleen bij FOUT, want daar
       moet iemand iets doen; bij LET OP en NIET GEMETEN zou het de regel
       onleesbaar maken zonder dat er een handeling tegenover staat. */
    const nietOk = signalen
      .filter((x) => x.niveau !== "OK")
      .map((x) => {
        const kop = `${x.groep}/${x.naam}=${x.niveau}${x.aanvaard === true ? "(aanvaard)" : ""}`;
        return x.niveau === "FOUT" && x.meting ? `${kop} [${x.meting.slice(0, 180)}]` : kop;
      })
      .join(" ");

    return (
      `signalen ${signalen.length} (${uitsplitsing}), zwaarste ${totaal}, ernst ${ernst.totaal}, ` +
      (nietOk ? `niet-ok: ${nietOk}, ` : "") +
      `meldingen open ${meld.open} (geopend ${meld.geopend}, gesloten ${meld.gesloten}), ` +
      `bezorgd ${meld.bezorgd}, bezorgfouten ${meld.bezorgfouten}, ` +
      `bestemming ${meld.bestemming || "NIET_INGESTELD"}, ` +
      /* DE MAILKETEN, apart leesbaar. 'aangeboden' en 'geaccepteerd' zijn
         twee verschillende dingen en worden ook zo gelogd; zie de
         kolomtoelichting bij intel.meld_berichten. */
      `mail[${mail.bestemming}] gepland ${mail.gepland}, nieuw ${mail.nieuw}, ` +
      `aangeboden ${mail.aangeboden}, geaccepteerd ${mail.geaccepteerd}, ` +
      `mislukt ${mail.mislukt}, uitgesteld ${mail.uitgesteld}, opgegeven ${mail.opgegeven}` +
      /* De STAND erbij, want `opgegeven` is wat deze ronde is afgesloten en
         dat zegt niets over hoeveel er in totaal ligt. Issue #45. */
      ` (totaal opgegeven ${mail.opgegevenTotaal})`
    );
  },

  /**
   * NIEUW IN 3.0.4 — de productiestand meten en loggen.
   *
   * STRIKT ALLEEN-LEZEN; zie ops/meting.ts, waar elke query een SELECT
   * is. Eigen eigenaarspool omdat de meting intel.migraties en
   * pg_constraint leest, en de applicatierol die eerste niet mag.
   *
   * DEZE TAAK FAALT WEL op een blootstelling of een poortmismatch. Dat
   * is het verschil met `gezondheid`: die meet een bewegende
   * operationele toestand en zou met werpen de dlq vullen. Dit zijn twee
   * harde tegenspraken — een credential in een foutkolom, of een rij die
   * READY_FOR_REVIEW heet terwijl een controle faalt — en die horen niet
   * stil in een logregel te verdwijnen.
   */
  async meting(_pool, organisatieId) {
    const { meetProductie } = await import("../ops/meting.ts");
    const { maakPool: maakEigenPool, metOrganisatie: metOrg } = await import("./db.ts");
    const { IntelFout } = await import("./fouten.ts");
    const { maakLogger } = await import("./log.ts");

    const eigenaarPool = maakEigenPool({ rol: null, max: 2 });
    const m = await metOrg(eigenaarPool, { organisatieId }, (c) =>
      meetProductie(c, organisatieId),
    );

    /* De logregel is het punt van deze taak: platte getallen, zodat een
       log-zoekopdracht ze vindt. */
    maakLogger("taak:meting").info("productiemeting", {
      kandidaten: m.kandidaten,
      voorstellen: m.voorstellen,
      volledige_feitelijke_revisies: m.volledigeFeitelijkeRevisies,
      gereed_feitelijk: m.gereedFeitelijk,
      gereed_alleen_link: m.gereedAlleenLink,
      gereed_onvolledig: m.gereedOnvolledig,
      poort_mismatch: m.poortMismatch,
      goedgekeurd: m.goedgekeurd,
      in_publicatieketen: m.inPublicatieketen,
      live_geverifieerd: m.gepubliceerd,
      afgewezen: m.afgewezen,
      mislukte_prechecks: m.mislukteprechecks,
      geblokkeerd_door_poort: m.geblokkeerdDoorPoort,
      uitspraken_totaal: m.uitspraken.totaal,
      /* DE TWEE TRAPPEN. Het antwoord op "hoeveel van de uitspraken is
         feitelijk compleet en verwoordbaar" stond nergens in een
         logregel, en de productiedatabase is privaat. Platte sleutels,
         zodat een logzoekopdracht ze vindt. */
      verwoordbaar: trapRegel(m.verwoordbaarheid),
      toepassingsgebied: trapRegel(m.toepassingsgebied),
      uitspraken_horizon_null: m.uitspraken.horizonNull,
      tijdgrens_schendingen: m.uitspraken.tijdgrensSchendingen,
      tijdgrens_constraint_gevalideerd: m.uitspraken.constraintGevalideerd,
      taken_met_credential: m.credentiallek.takenMetCredential,
      migraties_toegepast: m.migraties.toegepast,
    });

    const samenvatting =
      `kandidaten ${m.kandidaten}, voorstellen ${m.voorstellen}, ` +
      `volledige feitelijke revisies ${m.volledigeFeitelijkeRevisies} ` +
      `(gereed ${m.gereedFeitelijk}), linkvoorstellen gereed ${m.gereedAlleenLink}, ` +
      `goedgekeurd ${m.goedgekeurd}, live ${m.gepubliceerd}, ` +
      `uitspraken ${m.uitspraken.totaal} [verwoordbaar: ${trapRegel(m.verwoordbaarheid)}] ` +
      `[gebied: ${trapRegel(m.toepassingsgebied)}] ` +
      `(tijdgrensschendingen ${m.uitspraken.tijdgrensSchendingen}, ` +
      `constraint ${m.uitspraken.constraintGevalideerd === null ? "ONBEKEND" : m.uitspraken.constraintGevalideerd ? "gevalideerd" : "not valid"}), ` +
      `migraties ${m.migraties.toegepast}`;

    if (m.credentiallek.takenMetCredential > 0) {
      throw new IntelFout(
        "configuratie",
        `BLOOTSTELLING: ${m.credentiallek.takenMetCredential} fouttekst(en) bevatten een ` +
          `credential-URL (soorten: ${m.credentiallek.soorten.join(", ")}). Roteer INTEL_DB_URL ` +
          `via de geautoriseerde procedure. ${samenvatting}`,
        { herhaalbaar: false },
      );
    }
    if (m.poortMismatch > 0) {
      throw new IntelFout(
        "validatie",
        `POORTMISMATCH: ${m.poortMismatch} voorstel(len) staan op READY_FOR_REVIEW terwijl een ` +
          `opgeslagen controle op FAIL staat. ${samenvatting}`,
        { herhaalbaar: false },
      );
    }
    return samenvatting;
  },

  /**
   * NIEUW IN R2 — de wekelijkse operationele rapportage (§13).
   *
   * DEZE TAAK FAALT NIET OP SLECHT NIEUWS. Een week met nul nieuwe
   * bronitems of drie taken in de dlq is een MELDING, niet een fout in
   * het rapporteren. Werpen zou de backoff laten draaien en de dlq
   * vullen met een taak die juist moet melden dat de dlq vol is.
   *
   * Hij faalt WEL als het rapport zelf incompleet is: meetWeek() werpt
   * als er niet precies tien cijfers uitkomen. Een rapport met negen
   * regels leest als 'de tiende is niet van toepassing'.
   *
   * GEEN MAIL TENZIJ EXPLICIET GEVRAAGD. De cijfers gaan naar de
   * structuurlogger, net als bij `meting`; op Railway is dat logboek de
   * bestaande infrastructuur. Wie een wekelijkse mail wil, zet
   * INTEL_WEEKRAPPORT_MAIL — anders zou het plannen van deze taak
   * stilzwijgend post gaan versturen.
   *
   * Eigen eigenaarspool: het rapport leest intel.taken, en de
   * applicatierol mag die tabel wel, maar de meting hierboven gebruikt
   * hetzelfde patroon en het houdt de leesweg uniform.
   */
  async weekrapport(_pool, organisatieId, payload) {
    const { meetWeek, logWeekrapport, rapportAlsTekst } = await import("../ops/weekrapport.ts");
    const { maakPool: maakEigenPool, metOrganisatie: metOrg } = await import("./db.ts");
    const { maakLogger } = await import("./log.ts");

    const eigenaarPool = maakEigenPool({ rol: null, max: 2 });
    const rapport = await metOrg(eigenaarPool, { organisatieId }, (c) =>
      meetWeek(c, organisatieId, {
        ...(tekstOf(payload, "tot") ? { totDatum: tekstOf(payload, "tot")! } : {}),
      }),
    );

    logWeekrapport(rapport);

    /* De volledige tekst in één logregel erbij, zodat hij uit het
       Railway-log te knippen is zonder databasetoegang. Dat is dezelfde
       reden waarom de meting- en gezondheidstaken hun bevindingen
       uitschrijven: de productiedatabase is privaat. */
    maakLogger("taak:weekrapport").info("weekrapport tekst", {
      tekst: rapportAlsTekst(rapport),
    });

    if (process.env["INTEL_WEEKRAPPORT_MAIL"]) {
      /* BEWUST NIET GEÏMPLEMENTEERD ZONDER EEN EXPLICIET BESLUIT.
         De meldmaillaag bestaat (ops/meldmail.ts) en zou dit kunnen
         versturen, maar een wekelijkse mail is een nieuw uitgaand
         kanaal met een eigen bezorgboekhouding en een eigen
         idempotentiesleutel. Dat hoort een eigen ronde te zijn, niet
         een bijproduct van een rapportagetaak. De variabele is hier
         alleen om te MELDEN dat hij gezet is. */
      maakLogger("taak:weekrapport").waarschuwing(
        "INTEL_WEEKRAPPORT_MAIL is gezet, maar verzenden is nog niet aangesloten",
        {
          wat_er_wel_is: "het rapport staat volledig in het log hierboven",
          wat_er_nodig_is:
            "een eigen bezorgronde in ops/meldmail.ts met een idempotentiesleutel per week",
        },
      );
    }

    const perLabel: Record<string, number> = {};
    for (const c of rapport.cijfers) perLabel[c.label] = (perLabel[c.label] ?? 0) + 1;

    return (
      `week ${rapport.vanDatum} t/m ${rapport.totDatum}: ${rapport.cijfers.length} cijfers ` +
      `(${Object.entries(perLabel).map(([k, v]) => `${v} ${k}`).join(", ")})` +
      (rapport.aandacht.length > 0
        ? ` — AANDACHT: ${rapport.aandacht.join(" ;; ")}`
        : " — geen aandachtspunten")
    );
  },

  /**
   * NIEUW IN R2 — de indexatiedagstand vastleggen.
   *
   * FAALT WEL bij een weigering van bewaarDagstand(). Dat is het
   * verschil met `gezondheid`: die meet een bewegende toestand en zou
   * met werpen de dlq vullen. Hier is een weigering een TEGENSPRAAK —
   * bewaakScheiding() weigert een rapport waarin TECHNICALLY_INDEXABLE
   * en GOOGLE_INDEXED door elkaar lopen, en een NOT_AVAILABLE-regel met
   * een getal erin. Dat hoort niet stil in een logregel te verdwijnen,
   * want dan zou de dagstand een verzonnen indexatiecijfer gaan dragen.
   */
  async indexatie(pool, organisatieId) {
    const { bewaarDagstand, indexatieRapport } = await import("../analytics/koppelingen.ts");
    const { meetIndexeerbaar } = await import("../site/indexeerbaar.ts");
    const { IntelFout } = await import("./fouten.ts");
    const { maakLogger } = await import("./log.ts");

    const ti = await meetIndexeerbaar();
    const { regels } = await indexatieRapport(pool, organisatieId, {
      ...(ti.getal ? { technischIndexeerbaar: ti.getal } : {}),
    });

    const uit = await bewaarDagstand(pool, organisatieId, regels);
    if (!uit.ok) {
      throw new IntelFout(
        "validatie",
        `de indexatiedagstand is NIET bewaard: ${uit.reden}`,
        { herhaalbaar: false },
      );
    }

    const per = (l: string) => regels.filter((r) => r.label === l).length;
    maakLogger("taak:indexatie").info("indexatiedagstand", {
      datum: uit.datum,
      regels: uit.geschreven,
      measured: per("MEASURED"),
      inferred: per("INFERRED"),
      unverified: per("UNVERIFIED"),
      not_available: per("NOT_AVAILABLE"),
      technisch_indexeerbaar: ti.getal?.aantal ?? null,
      technisch_indexeerbaar_bron: ti.getal?.bron ?? "NIET GEMETEN",
      omgekeerde_pariteit: ti.pariteit.length,
    });

    return (
      `dagstand ${uit.datum}: ${uit.geschreven} regels ` +
      `(${per("MEASURED")} MEASURED, ${per("INFERRED")} INFERRED, ` +
      `${per("UNVERIFIED")} UNVERIFIED, ${per("NOT_AVAILABLE")} NOT_AVAILABLE), ` +
      `technisch indexeerbaar ${ti.getal?.aantal ?? "NIET GEMETEN"}` +
      (ti.pariteit.length > 0
        ? `, ${ti.pariteit.length} TEGENSTRIJDIGE sitemapregel(s): ${ti.pariteit.slice(0, 5).join(", ")}`
        : "")
    );
  },

  /**
   * De WEKELIJKSE restoretest: de back-up aantoonbaar terugzetten.
   *
   * DEZE HANDLER DOET HET WERK NIET ZELF, HIJ START DE CLI.
   * Dat is geen gemakzucht maar de enige veilige vorm, om twee redenen
   * die beide in de code staan:
   *
   *   1. `cli/restoretest.ts` roept `sluitAllePools()` aan als hij zijn
   *      bewijs heeft geregistreerd. In proces zou dat de pool van de
   *      WORKER sluiten, midden in zijn ronde. Een subproces heeft zijn
   *      eigen pools en kan die sluiten zonder iets anders te raken.
   *   2. De CLI is 800 regels met moduleniveau-state (`geslaagd`,
   *      `mislukt`, `containerGestart`, `WEGWERP_DB` per pid). Die tot
   *      functie maken is een herschrijving van code die net in
   *      productie is bewezen; een subproces gebruikt exact dezelfde
   *      implementatie zonder dat risico. Eén waarheid over wat een
   *      restoretest is.
   *
   * Een subproces starten is hier huisidioom: `ops/backup.ts`,
   * `ops/pgomgeving.ts` en `publicatie/pr.ts` doen hetzelfde.
   *
   * DE ISOLATIE EN HET SLOT ZITTEN IN DE CLI, NIET HIER. De CLI neemt
   * een advisory lock voordat hij iets doet, ruimt achtergebleven
   * wegwerpdatabases op, weigert elk doel dat niet de verse
   * wegwerpdatabase is, en dropt die daarna — ook als de proef faalt.
   * Deze handler voegt daar niets aan toe behalve de omgeving en een
   * tijdslimiet.
   *
   * WAAROM `INTEL_RESTORETEST_DOEL_URL` HIER UIT `INTEL_DB_URL` KOMT.
   * In de container staat geen Docker, dus de Docker-vorm kan niet. De
   * `--doel-url`-vorm maakt een NIEUWE database op een bestaande server
   * en dropt die daarna; op Railway is die server dezelfde als de
   * productieserver. Dat is bewust toegestaan en expliciet goedgekeurd:
   * een back-up van productie moet ook DAAR terug te zetten zijn. De
   * productiedatabase zelf (`railway`) wordt niet aangeraakt — de
   * grendel vóór pg_restore eist dat het doelpad exact de
   * wegwerpdatabase is.
   *
   * GEEN ONGECONTROLEERDE RETRIES. De planregel zet `max_pogingen` niet,
   * dus de wachtrijstandaard geldt; wat de retries hier werkelijk
   * begrenst is het slot: een tweede poging die start terwijl de eerste
   * nog loopt, vindt het slot bezet, meldt dat en stopt zonder iets te
   * registreren.
   */
  async restoretestronde(_pool, _organisatieId, payload) {
    const [{ execFile }, { promisify }, { APP_WORTEL }, { IntelFout }] = await Promise.all([
      import("node:child_process"),
      import("node:util"),
      import("./config.ts"),
      import("./fouten.ts"),
    ]);
    const draai = promisify(execFile);

    const doelUrl = process.env["INTEL_RESTORETEST_DOEL_URL"] ?? process.env["INTEL_DB_URL"];
    if (!doelUrl) {
      throw new IntelFout(
        "configuratie",
        "geen INTEL_RESTORETEST_DOEL_URL en geen INTEL_DB_URL; zonder beheer-URL kan er geen " +
          "geisoleerde wegwerpdatabase gemaakt worden en dus geen restoretest draaien",
        { herhaalbaar: false },
      );
    }

    /* 20 minuten. Ruim boven de gemeten duur (de productieproef van 14
       oktober 2026 deed de hele keten in enkele tienden van een minuut,
       met pg_restore in 2979 ms) en ruim onder 'oneindig'. Loopt hij
       toch vast, dan wordt het subproces gedood; de volgende ronde
       ruimt de achtergebleven wegwerpdatabase op, want dat is precies
       waarvoor die opruiming in de CLI staat. */
    const limietMs = 20 * 60 * 1000;
    const begin = Date.now();
    let uit = "";
    let fout = "";
    let gedood = false;
    try {
      const r = await draai(process.execPath, ["src/cli/restoretest.ts", "--uit-gcs"], {
        cwd: APP_WORTEL,
        env: { ...process.env, INTEL_RESTORETEST_DOEL_URL: doelUrl },
        timeout: limietMs,
        maxBuffer: 8 * 1024 * 1024,
      });
      uit = r.stdout;
      fout = r.stderr;
    } catch (e) {
      const f = e as { stdout?: string; stderr?: string; killed?: boolean; code?: number };
      uit = f.stdout ?? "";
      fout = f.stderr ?? "";
      gedood = f.killed === true;
      /* De CLI heeft zijn eigen mislukking al in intel.taken en in de
         bucket vastgelegd; deze fout is de WACHTRIJkant ervan. Beide
         horen te bestaan: het logboek draagt het bewijs, de taak draagt
         dat de ronde niet goed ging. */
      /* `poort` en niet `netwerk`: dit is een VERIFICATIE die dicht
         ging, geen hapering. Opnieuw proberen met dezelfde dump levert
         hetzelfde, en een retry-lus zou alleen meer wegwerpdatabases op
         de productieserver maken. Daarom ook expliciet niet
         herhaalbaar. */
      throw new IntelFout(
        "poort",
        `de restoretest ${gedood ? `werd afgebroken na ${limietMs / 60000} minuten` : `eindigde met exitcode ${f.code ?? "?"}`}. ` +
          `Laatste uitvoer: ${(uit + fout).slice(-500)}`,
        { herhaalbaar: false },
      );
    }

    /* De samenvattingsregel van de CLI is het antwoord. Hij is ook wat
       e2e-scenario 27 leest, dus de vorm staat vast. */
    const m = /geslaagd (\d+)\s+mislukt (\d+)/.exec(uit);
    const overgeslagen = /RESTORETEST OVERGESLAGEN/.test(uit);
    if (overgeslagen) {
      return `overgeslagen: het restoretestslot was in gebruik, er liep al een proef (venster ${String(payload["venster"] ?? "?")})`;
    }
    if (!m) {
      throw new IntelFout(
        "validatie",
        `de restoretest gaf geen samenvattingsregel; uitvoer eindigde op: ${(uit + fout).slice(-400)}`,
        { herhaalbaar: false },
      );
    }
    return (
      `restoretest gereed in ${Date.now() - begin} ms: ${m[1]} controles geslaagd, ${m[2]} mislukt ` +
      `(venster ${String(payload["venster"] ?? "?")}). Het bewijs staat in intel.taken en in de bucket.`
    );
  },
};

/**
 * De soorten die een worker kan uitvoeren.
 *
 * AFGELEID uit REGISTER en niet apart onderhouden. Een losse lijst zou
 * opnieuw uit de pas kunnen lopen met de handlers, en dat is precies het
 * defect dat 3.0.4 repareert.
 */
export const TAAKSOORTEN: readonly string[] = Object.keys(REGISTER);

/**
 * Soorten waarvan een AFGERONDE taak niet als worker-hartslag mag
 * gelden.
 *
 * `ops/gezondheid.ts` meet `worker/hartslag` als `max(gereed_op)` over
 * intel.taken, en vergelijkt dat met een drempel van 26 uur. Die meting
 * bedoelt: draait de worker zijn RONDE nog? Een taak die één keer per
 * WEEK afrondt, antwoordt die vraag niet — en zou hem wel beantwoorden
 * als hij meetelde: na de restoretest van zondagnacht zou de hartslag
 * tot maandagochtend OK melden, ook als de worker daarna meteen omviel.
 *
 * Dat is precies het soort signaal-dat-iets-anders-meet waar release
 * 3.0.7 en 3.0.8 over gaan, en het is de reden dat deze lijst bestaat
 * in plaats van dat één soortnaam in een query is gezet: komt er een
 * tweede zeldzame taak bij, dan hoort hij hier en niet in SQL.
 *
 * WAT HIER MET OPZET NIET IN STAAT: `backup` en `meting`. Die zijn
 * DAGELIJKS, en een dagelijkse taak binnen een drempel van 26 uur is
 * grensgeval — hij kan de hartslag tot een dag rekken. Dat is een
 * bestaande eigenschap van die drempel en geen gevolg van deze release;
 * het staat in het rapport als bevinding, niet als stille wijziging.
 */
export const NIET_HARTSLAGWAARDIGE_SOORTEN: readonly string[] = [
  "restoretestronde",
  /* NIEUW IN R2, en om exact dezelfde reden als restoretestronde: het
     weekrapport rondt één keer per WEEK af. Zou hij meetellen, dan
     meldde de hartslag na maandagochtend tot dinsdag OK — ook als de
     worker daarna meteen omviel. Een wekelijkse taak kan de vraag
     "draait de worker zijn ronde nog" niet beantwoorden. */
  "weekrapport",
  /* Het bewijsLOGBOEK. Die rijen zetten geen gereed_op, dus ze kunnen
     de hartslag al niet raken — maar ze staan hier zodat de bedoeling
     niet van die ene eigenschap afhangt. */
  "restoretest",
];

/** De geplande soorten, voor een toets die PLAN en REGISTER vergelijkt. */
export const GEPLANDE_SOORTEN: readonly string[] = PLAN.map((p) => p.soort);

export async function voerUit(
  pool: Pool,
  organisatieId: number,
  taak: { readonly soort: string; readonly payload: Record<string, unknown> },
): Promise<string> {
  const handler = REGISTER[taak.soort];
  if (!handler) {
    const { IntelFout } = await import("./fouten.ts");
    throw new IntelFout("configuratie", `onbekende taaksoort '${taak.soort}'`, {});
  }
  return handler(pool, organisatieId, taak.payload);
}
