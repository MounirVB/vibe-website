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
};

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

  async beoordelen(pool, organisatieId) {
    const { neemBesluiten } = await import("../besluit/motor.ts");
    const r = await neemBesluiten(pool, organisatieId, {});
    return `beoordeeld ${r.beoordeeld}, kandidaten ${r.kandidatenGeschreven}`;
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
  async backup(_pool, organisatieId) {
    const [{ maakBackup, KRITIEKE_TABELLEN }, { gcsConfigUitOmgeving, uploadNaarGcs }, { readFile }, { basename, join }, { APP_WORTEL, configLezen }] =
      await Promise.all([
        import("../ops/backup.ts"),
        import("../ops/gcsopslag.ts"),
        import("node:fs/promises"),
        import("node:path"),
        import("./config.ts"),
      ]);
    const { maakPool: maakEigenPool, zonderOrganisatie, rijen: leesRijen } = await import("./db.ts");
    const config = configLezen();

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
      `mislukt ${mail.mislukt}, uitgesteld ${mail.uitgesteld}, opgegeven ${mail.opgegeven}`
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
};

/**
 * De soorten die een worker kan uitvoeren.
 *
 * AFGELEID uit REGISTER en niet apart onderhouden. Een losse lijst zou
 * opnieuw uit de pas kunnen lopen met de handlers, en dat is precies het
 * defect dat 3.0.4 repareert.
 */
export const TAAKSOORTEN: readonly string[] = Object.keys(REGISTER);

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
