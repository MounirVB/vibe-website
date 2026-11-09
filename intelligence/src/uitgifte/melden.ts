/* ============================================================
   UITGIFTE — het meldpad: een mislukte uitgifte moet IEMAND bereiken
   ------------------------------------------------------------
   WAT ER AL WAS, EN WAAROM DAT NIET GENOEG IS.

   `meldUitgifteFout()` in uitgifte/opdracht.ts schrijft bij een mislukte
   stap een GEBLOKKEERD-regel in het publicatielogboek plus een
   auditregel, en logt een waarschuwing. Dat is een volledig AUDITSPOOR en
   geen alarm: het logboek wordt gelezen door wie al kijkt. De uitgifte is
   fail-closed, dus na drie mislukte uitgiftes staat de keten stil — en
   zonder meldpad merkt niemand dat tot iemand /uitgifte opent.

   DEZE LAAG MAAKT VAN DIE MISLUKKING EEN MELDING, OP WAT ER AL STAAT.

   GEEN NIEUWE TABEL EN GEEN NIEUWE DIENST. `intel.meldingen` (migratie
   0016) is precies hiervoor gebouwd: hij houdt STAAT bij (open, hoe vaak
   gezien, gesloten), dedupliceert in een partiële unieke index zodat
   dezelfde storing geen tweede rij maakt, en houdt BEZORGING apart van
   detectie — een melding die niet bezorgd kon worden blijft bestaan met
   zijn pogingen en zijn laatste fout. Er is geen kolom die deze laag
   mist; de twee additieve kolommen uit 0039 (`bundel`, `ernst`) worden
   meegevuld, en dat is wat de bestaande mailketen nodig heeft.

   DE TWEE KANALEN ZIJN DE BESTAANDE KANALEN

     webhook   ops/melden.ts — meldBestemming() leest INTEL_MELD_WEBHOOK
               en INTEL_MELD_TOKEN. Dit pad levert NU af, in dezelfde
               JSON-vorm die bezorgMeldingen() al post, zodat één
               ontvanger beide soorten meldingen kan verwerken.

     mail      ops/mail.ts + ops/meldmail.ts — meldmailRonde() leest open
               meldingen `where ernst is not null` en maakt er een bericht
               van in intel.meld_berichten. Deze laag stuurt zelf GEEN
               mail: hij zet de rij met een ernst neer, en de bestaande
               ronde pakt hem op. Een tweede mailopbouw naast
               bouwMeldplan() zou een tweede waarheid zijn.

   WAAROM `afgeleverd` DAN VALS KAN LIJKEN. Met alleen het mailkanaal
   geconfigureerd geeft deze functie `afgeleverd: false` terug met het
   kanaal 'mail (asynchroon)'. Dat is geen fout maar het eerlijke
   antwoord: op het moment van deze aanroep is er niets afgeleverd, en
   'aangeboden aan de provider' is iets anders dan 'de ontvanger heeft
   het gekregen' (zie de kolomuitleg bij meld_berichten.afgeleverd_op).

   GEMETEN STAND OP 9 NOVEMBER 2026 IN DE PRODUCTIECONTAINER:
   INTEL_MELD_WEBHOOK, INTEL_MELD_TOKEN, INTEL_MAIL_ACTIEF en
   INTEL_MONITOR_URL zijn ALLE VIER niet gezet. Er is dus vandaag geen
   kanaal, en dat is precies waarom `uitgifteMeldconfiguratie()` bestaat:
   het scherm hoort de ontbrekende variabelenamen te NOEMEN in plaats van
   een lege meldingenlijst te tonen die op 'alles in orde' lijkt.

   ------------------------------------------------------------
   DE BELANGRIJKSTE EIS: EEN MELDFOUT KOST NOOIT EEN AUDITREGEL

   De auditregel van een mislukte uitgifte wordt geschreven door
   legPublicatiebesluitVast() en legPublicatieAuditVast() in
   inhoud/actor.ts, binnen één transactie van metOrganisatie(). Een
   kapotte webhook mag dat spoor niet kosten. Drie dingen maken dat
   onmogelijk:

   1 EIGEN VERBINDING. Deze functie krijgt de POOL en nooit de client van
     de aanroeper. Elke schrijfactie hier loopt in haar eigen transactie.
     De transactie van de aanroeper kan er niet door afbreken en niet
     terugrollen, ook niet als deze laag midden in zijn werk omvalt.

   2 HIJ WERPT NIET. Geen enkele fout verlaat deze functie: een mislukte
     aflevering, een onbereikbare database, een afleverpad dat gooit, een
     uitgeputte pool — alles komt terug als `{ afgeleverd: false, reden }`
     en gaat naar het log. Een aanroeper die `await` zonder `try` doet,
     kan deze laag niet gebruiken om zijn eigen transactie te slopen.

   3 EEN HARDE TIJDSLIMIET. Een afleverpad dat blijft hangen houdt de
     uitgifteketen niet vast; na `tijdslimietMs` is het antwoord 'niet
     afgeleverd' en loopt de keten door.

   DE AANROEPER HOORT HEM NA DE COMMIT AAN TE ROEPEN. Binnen de
   transactie werkt het ook — punt 1 garandeert dat — maar dan wacht die
   transactie onnodig op een netwerkoproep, en een lange transactie houdt
   locks vast die niets met melden te maken hebben.

   GEEN IMPORT UIT uitgifte/opdracht.ts, EN DAT IS GEEN SMAAK. Dat
   bestand gaat deze module importeren. Zou deze module daar iets uit
   lezen op moduleniveau, dan is dat bij een kringverwijzing een
   onge-initialiseerde binding (TDZ) en valt de server om bij het laden.
   De drempels van de stroomonderbreker staan daarom in woorden in het
   advies en niet als geïmporteerde constante.
   ============================================================ */

import {
  metOrganisatie,
  eenRij,
  rijen,
  type Leesclient,
  type Pool,
} from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { netwerkToegestaanRuw } from "../kern/config.ts";
import { redigeer, redacteerFout } from "../kern/geheimen.ts";
import { meldBestemming } from "../ops/melden.ts";
import { mailBestemming } from "../ops/mail.ts";
import { bundelVan, ernstVan, type Meldernst } from "../ops/meldernst.ts";
import type { Signaal } from "../ops/gezondheid.ts";

const log = maakLogger("uitgifte-melden");

/**
 * De groep waaronder een uitgiftestoring in intel.meldingen staat.
 *
 * De groep is géén sieraad: ernstVan() leidt er de alarmklasse uit af
 * (de kritieke groepen zijn backup, database, beveiliging en publicatie),
 * en het dashboard filtert hierop om de uitgifteketen apart te kunnen
 * tonen. 'uitgifte' staat BEWUST niet in de kritieke groepen: een
 * mislukte uitgifte is een operationele fout en geen noodgeval — er gaat
 * niets stuk en er verdwijnt niets, er komt alleen niets uit.
 */
export const UITGIFTE_MELDGROEP = "uitgifte";

/** De sleutel van een uitgiftestoring: de dedupgrens is de STAP. */
export function uitgifteMeldsleutel(stap: string): string {
  return `${UITGIFTE_MELDGROEP}/${normaliseerStap(stap)}`;
}

/**
 * De stap, genormaliseerd.
 *
 * Dit is de deduplicatiesleutel, dus hij moet stabiel zijn: 'Generator'
 * en 'generator  ' zijn één storing en geen twee. Kleine letters,
 * samengevouwen witruimte, afgekapt op 60 tekens — de kolom is text,
 * maar een sleutel van een halve foutmelding dedupliceert nergens meer op.
 */
function normaliseerStap(ruw: unknown): string {
  const schoon = String(ruw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 60);
  /* GEEN LEGE SLEUTEL. Een melding zonder stap zou per aanroep op
     dezelfde sleutel 'uitgifte/' belanden en dus alles samenvoegen; dit
     label zegt wat er aan de hand is. */
  return schoon || "stap onbekend";
}

export type UitgifteStoring = {
  readonly inhoudVersieId: number | null;
  readonly stap: string;
  readonly fout: string;
  readonly beleidVersie: string | null;
};

/** Wat er over de lijn gaat. Dezelfde sleutelnamen als bezorgMeldingen(). */
export type Meldlading = {
  readonly dienst: string;
  readonly niveau: "FOUT";
  readonly ernst: Meldernst | null;
  readonly signaal: string;
  readonly groep: string;
  readonly meting: string;
  readonly advies: string;
  readonly sinds: string | null;
  readonly keren_gezien: number | null;
  readonly melding_id: number | null;
  readonly stap: string;
  readonly inhoud_versie_id: number | null;
  readonly beleid_versie: string | null;
};

/**
 * Het afleverpad. Werpt bij een mislukte aflevering.
 *
 * INJECTEERBAAR OMDAT DIT ANDERS NIET TE TOETSEN IS. Een toets mag geen
 * echte ontvanger hebben, en 'de webhook werkt' en 'de webhook is kapot'
 * zijn beide eigenschappen die vast moeten liggen. Zelfde patroon als
 * `nu` in bezorgMeldingen() en `verstuur` in meldmailRonde().
 */
export type Afleverpad = (lading: Meldlading) => Promise<void>;

export type Aflevering = {
  readonly afgeleverd: boolean;
  readonly kanaal: string;
  readonly reden: string;
};

/** De rij zoals de schrijfactie hem teruggeeft; `nieuw` is xmax = 0. */
type Meldingrij = {
  readonly id: number;
  readonly keren_gezien: number;
  readonly bezorgpogingen: number;
  readonly bezorgd_op: string | null;
  readonly geopend_op: string;
  readonly nieuw: boolean;
};

/* ------------------------------------------------------------------
   DE CONFIGURATIE, MET DE EXACTE VARIABELENAMEN

   Een scherm dat zegt "er is geen bestemming" laat de eigenaar zoeken.
   Een scherm dat de variabelenaam noemt, laat hem het zetten. De
   waarden worden NERGENS getoond — alleen of ze gezet zijn.
   ------------------------------------------------------------------ */

export type Kanaalnaam = "webhook" | "mail";

export type Variabelestand = {
  readonly naam: string;
  readonly kanaal: Kanaalnaam;
  readonly verplicht: boolean;
  readonly waarvoor: string;
  readonly gezet: boolean;
};

export type Kanaalstand = {
  readonly kanaal: Kanaalnaam;
  readonly werkt: boolean;
  /** Levert dit kanaal AF tijdens de aanroep, of pas in een latere ronde? */
  readonly directAflevert: boolean;
  readonly reden: string;
  readonly ontbrekend: readonly string[];
};

export type Meldconfiguratie = {
  readonly kanalen: readonly Kanaalstand[];
  readonly variabelen: readonly Variabelestand[];
  /** De namen die ontbreken, over alle kanalen. */
  readonly ontbrekend: readonly string[];
  /** Is er minstens één kanaal dat iets kan doen? */
  readonly kanWerken: boolean;
};

/** Het register van variabelen die dit meldpad leest. Geen andere. */
const VARIABELEN: readonly Omit<Variabelestand, "gezet">[] = [
  {
    naam: "INTEL_MELD_WEBHOOK",
    kanaal: "webhook",
    verplicht: true,
    waarvoor:
      "een door een mens goedgekeurde https-URL die POST met JSON accepteert; dit is het enige " +
      "kanaal dat tijdens de uitgifte zelf aflevert",
  },
  {
    naam: "INTEL_MELD_TOKEN",
    kanaal: "webhook",
    verplicht: false,
    waarvoor:
      "gaat mee als 'Authorization: Bearer'. Optioneel, en een leeg token is een GELDIGE stand — " +
      "dus een ontvanger zonder authenticatie geeft geen foutmelding",
  },
  {
    naam: "RESEND_API_KEY",
    kanaal: "mail",
    verplicht: true,
    waarvoor:
      "de bestaande Resend-sleutel; hij bestaat in het Railway-project op vibe-website-api en " +
      "moet als referentie op de meldende service staan",
  },
  {
    naam: "INTEL_MAIL_ONTVANGER",
    kanaal: "mail",
    verplicht: true,
    waarvoor: "het adres dat de melding krijgt. Er wordt geen ontvanger geraden",
  },
  {
    naam: "INTEL_MAIL_AFZENDER",
    kanaal: "mail",
    verplicht: true,
    waarvoor: "een adres op een domein met verzendrechten (vibeenergy.nl: DKIM en return-path staan in DNS)",
  },
  {
    naam: "INTEL_MAIL_ACTIEF",
    kanaal: "mail",
    verplicht: true,
    waarvoor:
      "de aan-schakelaar, LOS van de configuratie: geconfigureerd betekent niet dat er automatisch " +
      "gealarmeerd mag worden (1/ja/aan/true)",
  },
  {
    naam: "INTEL_MONITOR_URL",
    kanaal: "mail",
    verplicht: false,
    waarvoor: "de link naar het dashboard in het bericht; zonder deze waarde staat er geen link in de mail",
  },
];

function gezet(naam: string): boolean {
  return (process.env[naam] ?? "").trim() !== "";
}

const MAIL_ACTIEF = /^(1|ja|aan|true)$/i;

/**
 * Wat er NU werkt, en wat er ontbreekt.
 *
 * Leest de twee bestaande bestemmingsfuncties (meldBestemming en
 * mailBestemming) in plaats van hun regels na te bouwen: die twee zijn de
 * waarheid over 'is er een kanaal', en een tweede oordeel hier zou daar
 * stil van af kunnen wijken.
 */
export function uitgifteMeldconfiguratie(): Meldconfiguratie {
  const variabelen: Variabelestand[] = VARIABELEN.map((v) => ({ ...v, gezet: gezet(v.naam) }));
  const ontbrekendVan = (kanaal: Kanaalnaam) =>
    variabelen.filter((v) => v.kanaal === kanaal && v.verplicht && !v.gezet).map((v) => v.naam);

  const web = meldBestemming();
  const mail = mailBestemming();
  const mailAan = MAIL_ACTIEF.test((process.env["INTEL_MAIL_ACTIEF"] ?? "").trim());

  const kanalen: Kanaalstand[] = [
    {
      kanaal: "webhook",
      werkt: web.soort === "webhook",
      directAflevert: true,
      reden:
        web.soort === "webhook"
          ? `webhook naar ${new URL(web.url).host}${web.token ? " met token" : " ZONDER token"}`
          : web.reden,
      ontbrekend: ontbrekendVan("webhook"),
    },
    {
      kanaal: "mail",
      werkt: mail.soort === "resend" && mailAan,
      /* De mail gaat niet mee met deze aanroep: meldmailRonde() pakt de
         open melding op zodra hij draait. */
      directAflevert: false,
      reden:
        mail.soort !== "resend"
          ? mail.reden
          : mailAan
            ? `mail via Resend naar ${mail.ontvanger}; de meldmailronde pakt de melding op`
            : "INTEL_MAIL_ACTIEF staat niet aan, dus de meldmailronde plant en verstuurt niets",
      ontbrekend: ontbrekendVan("mail"),
    },
  ];

  return {
    kanalen,
    variabelen,
    ontbrekend: variabelen.filter((v) => v.verplicht && !v.gezet).map((v) => v.naam),
    kanWerken: kanalen.some((k) => k.werkt),
  };
}

/* ------------------------------------------------------------------
   HET STANDAARD AFLEVERPAD: DE BESTAANDE WEBHOOK
   ------------------------------------------------------------------ */

function webhookAfleverpad(): { pad: Afleverpad; kanaal: string } | null {
  const bestemming = meldBestemming();
  if (bestemming.soort === "geen") return null;
  const host = new URL(bestemming.url).host;
  return {
    kanaal: `webhook ${host}`,
    pad: async (lading) => {
      /* DE NETWERKNOODSTOP GELDT OOK HIER. Een toets die vergeet te
         injecteren gaat zo niet stil het internet op; hij krijgt een
         reden te zien. Zelfde grens als bronnen/http.ts. */
      if (!netwerkToegestaanRuw()) {
        throw new Error("INTEL_NETWERK_TOEGESTAAN staat op 0; er gaat geen melding de deur uit");
      }
      const antwoord = await fetch(bestemming.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(bestemming.token ? { authorization: `Bearer ${bestemming.token}` } : {}),
        },
        body: JSON.stringify(lading),
        signal: AbortSignal.timeout(10_000),
      });
      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
    },
  };
}

/**
 * Een tijdslimiet die geen onbehandelde afwijzing achterlaat.
 *
 * De verliezer van een `Promise.race` blijft lopen. Zou dat de ruwe
 * belofte van het afleverpad zijn, dan wordt een afwijzing ná de
 * tijdslimiet een unhandled rejection — en die zet in Node het hele
 * proces af. Daarom krijgt het werk eerst een eigen afhandeling en racet
 * pas het RESULTAAT tegen de klok.
 */
async function metTijdslimiet(
  werk: Promise<void>,
  ms: number,
): Promise<{ ok: true } | { ok: false; fout: unknown }> {
  const taak: Promise<{ ok: true } | { ok: false; fout: unknown }> = werk.then(
    () => ({ ok: true }) as const,
    (fout: unknown) => ({ ok: false, fout }) as const,
  );
  let klok: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      taak,
      new Promise<{ ok: false; fout: unknown }>((los) => {
        klok = setTimeout(
          () => los({ ok: false, fout: new Error(`het afleverpad gaf binnen ${ms} ms geen antwoord`) }),
          ms,
        );
        /* De klok mag het proces niet openhouden; een CLI die klaar is
           hoort af te sluiten. */
        klok.unref?.();
      }),
    ]);
  } finally {
    if (klok) clearTimeout(klok);
  }
}

/* ------------------------------------------------------------------
   DE FUNCTIE DIE DE UITGIFTELAAG AANROEPT
   ------------------------------------------------------------------ */

/**
 * Meldt een mislukking uit de uitgifteketen.
 *
 * WERPT NOOIT. Zie punt 2 in de kop: dit pad mag de auditregistratie van
 * de aanroeper niet kunnen beschadigen, dus elke fout komt terug als
 * `{ afgeleverd: false, reden }` en nooit als exceptie.
 *
 * WAT ER GEBEURT, IN DEZE ORDE
 *   1 de melding wordt vastgelegd of bijgewerkt in intel.meldingen, in
 *     een EIGEN transactie (dedup op organisatie + sleutel via de
 *     partiële unieke index van 0016);
 *   2 is er een direct kanaal, dan wordt er één poging gedaan;
 *   3 de uitkomst van die poging gaat in dezelfde bezorgkolommen die
 *     bezorgMeldingen() gebruikt, zodat de bestaande monitorronde een
 *     mislukte aflevering later gewoon opnieuw probeert.
 *
 * DE POGINGENGRENS IS DIE VAN bezorgMeldingen(): zolang `bezorgd_op`
 * leeg is geldt `bezorgpogingen < maxPogingen`. Is er ooit wél
 * afgeleverd, dan is bewezen dat het kanaal werkt en mag een nieuwe
 * mislukking weer een poging krijgen.
 */
export async function meldUitgifteStoring(
  pool: Pool,
  organisatieId: number,
  inv: UitgifteStoring,
  opties: {
    readonly afleverpad?: Afleverpad;
    readonly maxPogingen?: number;
    readonly tijdslimietMs?: number;
  } = {},
): Promise<Aflevering> {
  const maxPogingen = opties.maxPogingen ?? 5;
  const tijdslimietMs = opties.tijdslimietMs ?? 10_000;

  const stap = normaliseerStap(inv?.stap);
  const sleutel = `${UITGIFTE_MELDGROEP}/${stap}`;
  /* REDIGEREN VOOR HET AFKAPPEN, net als in bezorgMeldingen(): deze
     tekst gaat de database in, het log in en over de lijn. */
  const fout = redigeer(String(inv?.fout ?? "")).slice(0, 400) || "er is geen fouttekst meegegeven";
  const versie = Number.isInteger(inv?.inhoudVersieId) ? (inv.inhoudVersieId as number) : null;
  const beleidVersie = inv?.beleidVersie === null || inv?.beleidVersie === undefined
    ? null
    : redigeer(String(inv.beleidVersie)).slice(0, 120);

  const meting =
    `de uitgifte strandde bij '${stap}'` +
    `${versie === null ? "" : ` op inhoudsversie ${versie}`}` +
    `${beleidVersie === null ? "" : ` onder beleid ${beleidVersie}`}: ${fout}`;
  const advies =
    "de uitgifte is fail-closed: drie mislukte uitgiftes na de laatste geslaagde zetten de " +
    "stroomonderbreker aan en dan geeft de wachtrij niets meer af. Kijk op /uitgifte bij " +
    "'Mislukte uitgiftes' en bij de stopcondities.";

  /* DE ERNST KOMT UIT ernstVan(), niet uit een keuze hier. Eén waarheid
     over wat een signaal voor een mens betekent; met groep 'uitgifte'
     buiten de kritieke groepen is dat FOUT en niet CRITICAL. De ernst is
     tegelijk de voorwaarde waarop meldmailRonde() open meldingen
     selecteert (`ernst is not null`), dus zonder deze stap zou het
     mailkanaal de melding nooit zien. */
  const signaal: Signaal = {
    groep: UITGIFTE_MELDGROEP,
    naam: stap,
    niveau: "FOUT",
    meting,
    advies,
  };
  const ernst = ernstVan(signaal);
  const bundel = bundelVan(signaal);

  /* ---------------- 1 vastleggen, in een eigen transactie ---------- */
  let rij: Meldingrij | null = null;
  let vastlegfout = "";
  try {
    rij = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<Meldingrij>(
        c,
        `insert into intel.meldingen
           (organisatie_id, sleutel, groep, niveau, laatste_meting, laatste_advies, bundel, ernst)
         values ($1, $2, $3, 'FOUT', $4, $5, $6, $7)
         on conflict (organisatie_id, sleutel) where gesloten_op is null
         do update set laatst_gezien_op = now(),
                       keren_gezien     = intel.meldingen.keren_gezien + 1,
                       niveau           = excluded.niveau,
                       laatste_meting   = excluded.laatste_meting,
                       laatste_advies   = excluded.laatste_advies,
                       bundel           = excluded.bundel,
                       ernst            = excluded.ernst
         returning id, keren_gezien, bezorgpogingen, bezorgd_op::text as bezorgd_op,
                   geopend_op::text as geopend_op, (xmax = 0) as nieuw`,
        [organisatieId, sleutel, UITGIFTE_MELDGROEP, meting, advies, bundel, ernst],
      ),
    );
  } catch (e) {
    /* DE MELDING IS NIET VASTGELEGD, EN DAT IS ERNSTIG — maar het is
       geen reden om te werpen en de aanroeper mee te nemen. */
    vastlegfout = redacteerFout(e);
    /* HET VELD HEET `signaal` EN NIET `sleutel`, en dat is geen
       woordkeus: kern/geheimen.ts vervangt de WAARDE van elk veld
       waarvan de NAAM op een geheim lijkt, en 'sleutel' staat in dat
       patroon. Een logregel met `sleutel: "uitgifte/generator"` leest
       dus als `[verborgen]` en is onbruikbaar. ops/melden.ts logt om
       dezelfde reden `signaal`. */
    log.fout("uitgiftemelding niet vastgelegd", { signaal: sleutel, fout: vastlegfout.slice(0, 200) });
  }

  /* ---------------- 2 het kanaal kiezen ---------------- */
  const conf = uitgifteMeldconfiguratie();
  const ingespoten = opties.afleverpad;
  const web = ingespoten === undefined ? webhookAfleverpad() : { pad: ingespoten, kanaal: "ingespoten afleverpad" };

  const staat = (afgeleverd: boolean, kanaal: string, reden: string): Aflevering => ({
    afgeleverd,
    kanaal,
    reden: vastlegfout
      ? `${reden} — LET OP: de melding kon niet in intel.meldingen worden vastgelegd (${vastlegfout.slice(0, 160)})`
      : reden,
  });

  if (web === null) {
    /* GEEN DIRECT KANAAL. De melding staat er wel, en het mailkanaal kan
       hem later alsnog oppakken; dat is iets anders dan afgeleverd. */
    const mailKanaal = conf.kanalen.find((k) => k.kanaal === "mail");
    const ontbreekt = conf.ontbrekend.length
      ? ` Niet gezet: ${conf.ontbrekend.join(", ")}.`
      : "";
    if (mailKanaal?.werkt) {
      return staat(
        false,
        "mail (asynchroon)",
        `er is geen direct kanaal (${conf.kanalen.find((k) => k.kanaal === "webhook")?.reden ?? "webhook uit"}); ` +
          `de melding staat open in intel.meldingen${rij ? ` (id ${rij.id})` : ""} met ernst ${ernst} en wordt ` +
          `door de meldmailronde opgepakt.${ontbreekt}`,
      );
    }
    return staat(
      false,
      "geen",
      `er is geen enkel meldkanaal geconfigureerd, dus deze storing bereikt op dit moment NIEMAND. ` +
        `De melding staat open in intel.meldingen${rij ? ` (id ${rij.id})` : ""}.${ontbreekt}`,
    );
  }

  if (rij !== null && rij.bezorgd_op === null && rij.bezorgpogingen >= maxPogingen) {
    return staat(
      false,
      web.kanaal,
      `de pogingengrens van ${maxPogingen} is bereikt en er is nog nooit afgeleverd; de melding ` +
        `blijft open staan met zijn laatste fout, en dan is het aan een mens`,
    );
  }

  /* ---------------- 3 één poging, met tijdslimiet ---------------- */
  const lading: Meldlading = {
    dienst: "vibe-energy-intelligence",
    niveau: "FOUT",
    ernst,
    signaal: sleutel,
    groep: UITGIFTE_MELDGROEP,
    meting,
    advies,
    sinds: rij?.geopend_op ?? null,
    keren_gezien: rij?.keren_gezien ?? null,
    melding_id: rij?.id ?? null,
    stap,
    inhoud_versie_id: versie,
    beleid_versie: beleidVersie,
  };

  let uitkomst: { ok: true } | { ok: false; fout: unknown };
  try {
    uitkomst = await metTijdslimiet(
      /* De aanroep zelf staat ook in de try: een afleverpad dat
         SYNCHROON gooit levert geen belofte op, en dan zou
         metTijdslimiet() nooit worden bereikt. */
      (async () => {
        await web.pad(lading);
      })(),
      tijdslimietMs,
    );
  } catch (e) {
    uitkomst = { ok: false, fout: e };
  }

  const bericht = uitkomst.ok ? "" : redacteerFout(uitkomst.fout);

  /* De bezorgstand in dezelfde kolommen die 0016 ervoor heeft, zodat de
     monitorronde en het dashboard geen tweede register hoeven te kennen.
     Ook dit in een EIGEN transactie, en ook dit mag niet werpen. */
  if (rij !== null) {
    try {
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(
          uitkomst.ok
            ? `update intel.meldingen
                  set bezorgd_op         = now(),
                      bezorgpogingen     = bezorgpogingen + 1,
                      bestemming         = $2,
                      laatste_bezorgfout = null
                where id = $1`
            : `update intel.meldingen
                  set bezorgpogingen     = bezorgpogingen + 1,
                      laatste_bezorgfout = $2
                where id = $1`,
          [rij.id, uitkomst.ok ? web.kanaal.slice(0, 200) : bericht.slice(0, 300)],
        ),
      );
    } catch (e) {
      log.fout("bezorgstand van de uitgiftemelding niet bijgewerkt", {
        melding: rij.id,
        fout: redacteerFout(e).slice(0, 200),
      });
    }
  }

  if (uitkomst.ok) {
    log.info("uitgiftestoring gemeld", {
      signaal: sleutel,
      kanaal: web.kanaal,
      melding: rij?.id ?? null,
    });
    return staat(true, web.kanaal, `afgeleverd via ${web.kanaal}`);
  }

  log.waarschuwing("uitgiftestoring NIET gemeld", {
    signaal: sleutel,
    kanaal: web.kanaal,
    melding: rij?.id ?? null,
    fout: bericht.slice(0, 200),
  });
  return staat(
    false,
    web.kanaal,
    `de aflevering mislukte: ${bericht.slice(0, 240)}. De melding blijft open in intel.meldingen` +
      `${rij ? ` (id ${rij.id})` : ""}, dus de monitorronde probeert hem opnieuw.`,
  );
}

/* ------------------------------------------------------------------
   DE STAND, VOOR HET SCHERM

   Eén leesfunctie naast de schrijffunctie, zodat de sleutelvorm
   ('uitgifte/<stap>') op één plek staat. Zou het dashboard zijn eigen
   query hebben, dan is een hernoemde groep een stille lege tabel.
   ------------------------------------------------------------------ */

export type OpenUitgiftemelding = {
  readonly id: number;
  readonly sleutel: string;
  readonly niveau: string;
  readonly ernst: string | null;
  readonly geopend_op: string;
  readonly laatst_gezien_op: string;
  readonly keren_gezien: number;
  readonly laatste_meting: string;
  readonly laatste_advies: string | null;
  readonly bezorgd_op: string | null;
  readonly bezorgpogingen: number;
  readonly laatste_bezorgfout: string | null;
  readonly bestemming: string | null;
};

export type Meldberichtstand = {
  readonly soort: string;
  readonly onderwerp: string;
  readonly aangemaakt_op: string;
  readonly aangeboden_op: string | null;
  readonly geaccepteerd_op: string | null;
  readonly opgegeven_op: string | null;
  readonly laatste_fout: string | null;
  readonly pogingen: number;
};

export type Uitgiftemeldstand = {
  readonly open: readonly OpenUitgiftemelding[];
  /** Alle uitgiftemeldingen ooit, open en gesloten. */
  readonly totaal: number;
  readonly openTotaal: number;
  /** De laatste GELUKTE aflevering over het webhookkanaal. */
  readonly laatstBezorgd: string | null;
  /** Hoeveel open uitgiftemeldingen een laatste bezorgfout dragen. */
  readonly metBezorgfout: number;
  /** Het laatste meldbericht (mailkanaal) dat over een uitgiftemelding ging. */
  readonly mail: Meldberichtstand | null;
};

/**
 * De meldstand van de uitgifteketen.
 *
 * WAT HIER NIET GEMETEN KAN WORDEN, EN DAT HOORT ZO TE STAAN:
 * `intel.meldingen` heeft geen tijdstempel van de laatste POGING. 0016
 * geeft `bezorgd_op` (wanneer het lukte), `bezorgpogingen` en
 * `laatste_bezorgfout` (wat er het laatst misging), maar niet WANNEER een
 * mislukte poging was. Het moment van de laatste mislukte aflevering is
 * dus NIET GEMETEN; het scherm zegt dat ook zo in plaats van
 * `laatst_gezien_op` te tonen alsof dat hetzelfde is — dat is het moment
 * van de laatste DETECTIE.
 */
export async function leesUitgifteMeldstand(
  c: Leesclient,
  organisatieId: number,
): Promise<Uitgiftemeldstand> {
  const open = await rijen<OpenUitgiftemelding>(
    c,
    `select id, sleutel, niveau, ernst,
            geopend_op::text       as geopend_op,
            laatst_gezien_op::text as laatst_gezien_op,
            keren_gezien, laatste_meting, laatste_advies,
            bezorgd_op::text as bezorgd_op, bezorgpogingen, laatste_bezorgfout, bestemming
       from intel.meldingen
      where organisatie_id = $1 and groep = $2 and gesloten_op is null
      order by laatst_gezien_op desc
      limit 25`,
    [organisatieId, UITGIFTE_MELDGROEP],
  );

  const som = await eenRij<{
    totaal: number;
    open_totaal: number;
    laatst_bezorgd: string | null;
    met_bezorgfout: number;
  }>(
    c,
    `select count(*)::int                                              as totaal,
            count(*) filter (where gesloten_op is null)::int           as open_totaal,
            max(bezorgd_op)::text                                      as laatst_bezorgd,
            count(*) filter (where gesloten_op is null
                               and laatste_bezorgfout is not null)::int as met_bezorgfout
       from intel.meldingen
      where organisatie_id = $1 and groep = $2`,
    [organisatieId, UITGIFTE_MELDGROEP],
  );

  /* HET MAILKANAAL LEEST MEE VIA melding_ids. intel.meld_berichten
     bewaart welke meldingen in een bericht zaten; de arrayoverlap (`&&`)
     is daarmee de enige koppeling die geen tekst hoeft te raden. Een
     lege verzameling geeft `false` en dus geen rij — niet per ongeluk
     het laatste bericht over iets anders. */
  const mail = await eenRij<Meldberichtstand>(
    c,
    `select mb.soort, mb.onderwerp,
            mb.aangemaakt_op::text   as aangemaakt_op,
            mb.aangeboden_op::text   as aangeboden_op,
            mb.geaccepteerd_op::text as geaccepteerd_op,
            mb.opgegeven_op::text    as opgegeven_op,
            mb.laatste_fout, mb.pogingen
       from intel.meld_berichten mb
      where mb.organisatie_id = $1
        and mb.melding_ids && (select coalesce(array_agg(m.id), '{}'::bigint[])
                                 from intel.meldingen m
                                where m.organisatie_id = $1 and m.groep = $2)
      order by mb.aangemaakt_op desc
      limit 1`,
    [organisatieId, UITGIFTE_MELDGROEP],
  );

  return {
    open,
    totaal: som?.totaal ?? 0,
    openTotaal: som?.open_totaal ?? 0,
    laatstBezorgd: som?.laatst_bezorgd ?? null,
    metBezorgfout: som?.met_bezorgfout ?? 0,
    mail,
  };
}
