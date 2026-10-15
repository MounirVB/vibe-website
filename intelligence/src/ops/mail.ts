/* ============================================================
   OPS — mail: het verzendkanaal voor operationele meldingen
   ------------------------------------------------------------
   WAAROM RESEND, EN WAAROM GEEN NIEUWE DIENST

   De opdracht vraagt bestaande infrastructuur te hergebruiken. Gemeten op
   14 oktober 2026:

     * `RESEND_API_KEY` bestaat AL in het Railway-project, op de service
       `vibe-website-api`. Er is dus een Resend-account, en er komt geen
       nieuw abonnement bij.
     * Het DNS van vibeenergy.nl is er al op ingericht:
         resend._domainkey.vibeenergy.nl   DKIM, RSA-1024, gepubliceerd
         send.vibeenergy.nl  MX   feedback-smtp.eu-west-1.amazonses.com
         send.vibeenergy.nl  TXT  v=spf1 include:amazonses.com ~all
       Dat is precies de recordset die Resend eist voor een geverifieerd
       verzenddomein.
     * DMARC staat op `p=none; adkim=r; aspf=r`. Met RELAXED alignment
       lijnt een DKIM-signature met d=vibeenergy.nl uit op een afzender
       @vibeenergy.nl, en lijnt het return-path send.vibeenergy.nl uit op
       hetzelfde organisatiedomein. Beide alignments halen het dus.

   WAAROM DE HTTP-API EN GEEN SMTP. Er is ook een SMTP-pad op deze machine
   (een ander product, credential in de macOS Keychain). Dat is op Railway
   per definitie onbruikbaar: een Keychain-aanroep bestaat daar niet, en
   uitgaande SMTP-poorten zijn op hostingnetwerken vaak dicht. De
   HTTPS-API heeft geen van die twee problemen en gebruikt hetzelfde
   credential dat er al is.

   WAT DEZE MODULE NIET DOET
   Hij beslist niet OF er gemaild wordt en WAT erin staat — dat is
   ops/meldmail.ts. Hij stuurt een bericht en zegt eerlijk wat de
   uitkomst was. Hij claimt nooit meer dan 'de provider heeft het
   geaccepteerd', want dat is het enige dat een 200 met een id bewijst.
   ============================================================ */

import { maakLogger } from "../kern/log.ts";
import { redigeer, redacteerFout } from "../kern/geheimen.ts";

const log = maakLogger("mail");

/** De API van Resend. Eén endpoint, één methode. */
const RESEND_URL = "https://api.resend.com/emails";

export type MailBestemming =
  | { readonly soort: "geen"; readonly reden: string }
  | {
      readonly soort: "resend";
      readonly ontvanger: string;
      readonly afzender: string;
      readonly sleutel: string;
    };

/* Een adres dat we durven te gebruiken: geen witruimte, geen regeleinde,
   precies één @, en een punt in het domein. Strenger dan RFC 5322 en dat
   is de bedoeling — dit is een configuratiewaarde van ons zelf, geen
   gebruikersinvoer die we moeten accommoderen. */
const ADRES = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/* Een afzender mag ook de vorm `Naam <adres@domein>` hebben. */
const ADRES_MET_NAAM = /^[^<>\r\n]{1,64}<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;

function adresGeldig(a: string): boolean {
  if (/[\r\n\t]/.test(a)) return false;
  if (ADRES.test(a)) return true;
  const m = ADRES_MET_NAAM.exec(a);
  return m !== null && ADRES.test(m[1]!);
}

/**
 * Welke bestemming is er?
 *
 * Geeft bewust een BESCHRIJVING terug als er geen is, zodat elke
 * aanroeper dezelfde reden kan tonen in plaats van zelf iets te
 * bedenken. Zelfde patroon als meldBestemming() in melden.ts.
 *
 * DE DRIE WAARDEN ZIJN APART, en dat is geen omslachtigheid: zonder
 * expliciete ontvanger zou een verkeerd geconfigureerde omgeving stil
 * naar een verkeerd adres kunnen mailen, en dat is erger dan niet mailen.
 */
export function mailBestemming(): MailBestemming {
  const sleutel = (process.env["RESEND_API_KEY"] ?? "").trim();
  const ontvanger = (process.env["INTEL_MAIL_ONTVANGER"] ?? "").trim();
  const afzender = (process.env["INTEL_MAIL_AFZENDER"] ?? "").trim();

  if (!sleutel) {
    return {
      soort: "geen",
      reden:
        "RESEND_API_KEY is niet gezet op deze service. De sleutel bestaat wel in het " +
        "Railway-project (op vibe-website-api); hij moet als referentie beschikbaar worden " +
        "gemaakt op de service die meldt.",
    };
  }
  if (!ontvanger) {
    return {
      soort: "geen",
      reden:
        "INTEL_MAIL_ONTVANGER is niet gezet. Er wordt geen ontvanger geraden: een melding die " +
        "naar een verzonnen adres gaat verdwijnt in het niets terwijl het systeem zegt dat hij " +
        "verstuurd is, en dat is erger dan geen alerteerder.",
    };
  }
  if (!adresGeldig(ontvanger)) {
    return { soort: "geen", reden: "INTEL_MAIL_ONTVANGER is geen geldig e-mailadres." };
  }
  if (!afzender) {
    return {
      soort: "geen",
      reden:
        "INTEL_MAIL_AFZENDER is niet gezet. De afzender moet op een domein staan waarvoor " +
        "verzendrechten zijn vastgesteld (vibeenergy.nl: DKIM en return-path staan in DNS).",
    };
  }
  if (!adresGeldig(afzender)) {
    return { soort: "geen", reden: "INTEL_MAIL_AFZENDER is geen geldig e-mailadres." };
  }
  return { soort: "resend", ontvanger, afzender, sleutel };
}

/* ------------------------------------------------------------------
   TIJD IN EUROPE/AMSTERDAM, MET ZOMERTIJD

   Niet met een vaste offset. `Intl.DateTimeFormat` met timeZone kent de
   tzdata en dus de overgangen; +01:00 hardcoderen is in de zomer een uur
   mis, en dat is precies de fout die in release 3.0.7 in een
   gezondheidsregel zat (to_char zonder `at time zone`).
   ------------------------------------------------------------------ */

const AMSTERDAM = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

/** '13 oktober 2026 om 18:01 CEST' — met de echte zone van dat moment. */
export function nederlandseTijd(iso: string | Date | null | undefined): string {
  if (!iso) return "onbekend";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "onbekend";
  const delen = AMSTERDAM.formatToParts(d);
  const deel = (t: string) => delen.find((x) => x.type === t)?.value ?? "";
  return (
    `${deel("day")} ${deel("month")} ${deel("year")} om ${deel("hour")}:${deel("minute")} ` +
    `${deel("timeZoneName")}`
  );
}

/* ------------------------------------------------------------------
   HEADERINJECTIE

   Een onderwerp met een regeleinde erin kan bij een SMTP-gateway een
   extra header worden (Bcc:, Reply-To:). Resend neemt JSON aan en is
   daar zelf niet kwetsbaar voor, maar dit is een grendel op de BRON en
   niet op de provider: verander de provider ooit, dan hoort de grendel
   er nog te staan. Daarom weigeren we het hier in plaats van te
   vertrouwen op wat de ontvangende kant doet.
   ------------------------------------------------------------------ */

const REGELEINDE = /[\r\n\u2028\u2029\u0000]/;

/* IDEMPOTENTIE BIJ DE PROVIDER — WAT DIT WEL EN NIET GARANDEERT
   Resend accepteert een header `Idempotency-Key`: maximaal 256 tekens,
   geldig 24 uur. Dezelfde sleutel met DEZELFDE payload binnen dat
   venster geeft volgens de documentatie "the same response, without
   actually sending the email again". Dezelfde sleutel met een ANDERE
   payload geeft 409 `invalid_idempotent_request`, en een nog lopend
   verzoek met dezelfde sleutel geeft 409 `concurrent_idempotent_requests`,
   met de toevoeging dat later opnieuw proberen veilig is.

   WAAROM DIT NODIG IS NAAST EEN DATABASEGRENDEL. Een vergrendeling in de
   database voorkomt dat twee rondes hetzelfde bericht AANBIEDEN. Zij kan
   niet voorkomen dat de provider een bericht aanneemt en onze transactie
   daarna terugdraait — een crash, een verbroken verbinding, een statement
   timeout tussen de 200 en de commit. Dan weet de database niets van de
   acceptatie en biedt een volgende ronde hetzelfde bericht opnieuw aan.
   Alleen de provider kan die tweede mail nog tegenhouden, en dat doet hij
   op deze sleutel.

   De vorm is streng: alleen wat meldmail.ts zelf opbouwt. Dit is geen
   gebruikersinvoer die we moeten accommoderen, en een headerwaarde met
   een regeleinde erin is een injectie. */
const IDEMPOTENTIESLEUTEL = /^[A-Za-z0-9._:-]{8,256}$/;

export function onderwerpVeilig(ruw: string): string {
  const schoon = redigeer(ruw).replace(/[\r\n\u2028\u2029\u0000]+/g, " ").replace(/\s+/g, " ").trim();
  /* 998 is de RFC-grens voor een headerregel; 180 is wat een mens leest. */
  return schoon.slice(0, 180);
}

export type MailUitkomst = {
  /** De provider heeft het bericht AANGENOMEN. Niet: de ontvanger heeft het. */
  readonly geaccepteerd: boolean;
  readonly providerId: string | null;
  readonly provider: "resend";
  readonly fout: string | null;
  /** Mag het opnieuw geprobeerd worden? Een 4xx-configuratiefout niet. */
  readonly herhaalbaar: boolean;
};

/**
 * Verstuurt één bericht.
 *
 * Werpt NIET. De uitkomst is data, want de aanroeper moet hem in het
 * logboek kunnen schrijven — ook als het misging.
 */
export async function verstuurMail(
  bericht: {
    readonly onderwerp: string;
    readonly html: string;
    readonly tekst: string;
  },
  opties: {
    readonly fetchImpl?: typeof fetch;
    readonly timeoutMs?: number;
    /**
     * De idempotentiesleutel voor de provider. Zie IDEMPOTENTIE hieronder.
     *
     * Weglaten mag: dan gedraagt deze functie zich als voorheen. De
     * losse testmail van cli/meldmail.ts geeft hem niet mee, omdat die
     * zijn eigen grendel in de vingerafdruk per minuut heeft.
     */
    readonly idempotentieSleutel?: string | null;
  } = {},
): Promise<MailUitkomst> {
  const b = mailBestemming();
  if (b.soort === "geen") {
    return { geaccepteerd: false, providerId: null, provider: "resend", fout: b.reden, herhaalbaar: false };
  }

  const onderwerp = onderwerpVeilig(bericht.onderwerp);
  if (onderwerp.length < 10) {
    return {
      geaccepteerd: false,
      providerId: null,
      provider: "resend",
      fout: "het onderwerp is na opschonen te kort om te versturen",
      herhaalbaar: false,
    };
  }
  /* Dubbele grendel: het adres is al bij de configuratie getoetst, maar
     een regeleinde hier zou alsnog een header kunnen worden. */
  if (REGELEINDE.test(b.ontvanger) || REGELEINDE.test(b.afzender)) {
    return {
      geaccepteerd: false,
      providerId: null,
      provider: "resend",
      fout: "ontvanger of afzender bevat een regeleinde; geweigerd wegens headerinjectie",
      herhaalbaar: false,
    };
  }

  /* EEN SLEUTEL IS EEN HEADERWAARDE, DUS DEZELFDE GRENDEL ALS HIERBOVEN.
     Hij wordt in meldmail.ts uit gehele getallen opgebouwd en kan dus
     geen regeleinde bevatten — maar dat is een eigenschap van de
     aanroeper, en die mag deze module niet aannemen. */
  const sleutel = opties.idempotentieSleutel ?? null;
  if (sleutel !== null && !IDEMPOTENTIESLEUTEL.test(sleutel)) {
    return {
      geaccepteerd: false,
      providerId: null,
      provider: "resend",
      fout: "de idempotentiesleutel heeft een ongeldige vorm; geweigerd wegens headerinjectie",
      herhaalbaar: false,
    };
  }

  const doe = opties.fetchImpl ?? fetch;
  try {
    const antwoord = await doe(RESEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${b.sleutel}`,
        ...(sleutel === null ? {} : { "idempotency-key": sleutel }),
      },
      body: JSON.stringify({
        from: b.afzender,
        to: [b.ontvanger],
        subject: onderwerp,
        html: bericht.html,
        text: bericht.tekst,
      }),
      signal: AbortSignal.timeout(opties.timeoutMs ?? 15_000),
    });

    const ruw = await antwoord.text();
    if (!antwoord.ok) {
      /* 4xx is onze fout (verkeerd adres, niet-geverifieerd domein,
         ongeldige sleutel) en lost zich niet op door te wachten. 5xx en
         429 wel.

         EEN 409 IS TWEE DINGEN, EN MAAR EEN ERVAN IS HERHAALBAAR.
         `concurrent_idempotent_requests` betekent dat er nog een verzoek
         met dezelfde sleutel loopt; de documentatie zegt uitdrukkelijk
         dat later opnieuw proberen veilig is. `invalid_idempotent_request`
         betekent dat dezelfde sleutel eerder met een ANDERE payload is
         gebruikt, en dan is wachten zinloos: "Retrying this request is
         useless without changing the idempotency key or payload." Dat
         laatste is bij ons een programmeerfout — de inhoud van een rij
         staat vast — en hoort dus hard op te vallen in plaats van vijf
         keer herhaald te worden. */
      const herhaalbaar =
        antwoord.status >= 500 ||
        antwoord.status === 429 ||
        (antwoord.status === 409 && ruw.includes("concurrent_idempotent_requests"));
      return {
        geaccepteerd: false,
        providerId: null,
        provider: "resend",
        /* De sleutel kan in een foutecho terugkomen; redigeer eerst. */
        fout: redigeer(`HTTP ${antwoord.status}: ${ruw.slice(0, 300)}`, [b.sleutel]),
        herhaalbaar,
      };
    }

    let id: string | null = null;
    try {
      const d = JSON.parse(ruw) as { id?: unknown };
      if (typeof d.id === "string" && d.id.length > 0) id = d.id;
    } catch {
      /* Een 200 zonder leesbare JSON: geaccepteerd, maar zonder id. Dat
         is eerlijker dan doen alsof er geen id hoort te zijn. */
    }
    log.info("meldbericht aangeboden en geaccepteerd", { provider: "resend", provider_id: id });
    return { geaccepteerd: true, providerId: id, provider: "resend", fout: null, herhaalbaar: false };
  } catch (e) {
    /* Netwerkfout of time-out: herhaalbaar. redacteerFout haalt een
       eventuele credential-URL uit de tekst. */
    const fout = redigeer(redacteerFout(e), [b.sleutel]);
    return { geaccepteerd: false, providerId: null, provider: "resend", fout, herhaalbaar: true };
  }
}
