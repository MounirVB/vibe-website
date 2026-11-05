/* ============================================================
   ANALYTICS — Google Search Console, de echte koppeling
   ------------------------------------------------------------
   WAT HIER STAAT, EN WAT ER HIERVOOR NIET STOND.

   Tot nu toe bestonden de namen INTEL_GSC_CLIENT_EMAIL,
   INTEL_GSC_PRIVATE_KEY en INTEL_GSC_SITE_URL uitsluitend in
   kern/config.ts als LABELS voor de koppelingenmonitor. Er was geen
   enkele regel code die ze uitlas, geen API-client, en geen dependency:
   package.json heeft alleen express en pg. GSC_IMPORT_CONTRACT in
   koppelingen.ts beschreef een pad dat niet bestond.

   Deze module is dat pad. Geen dependency erbij: de JWT-bearer-stroom
   is dertig regels crypto, en die staan al bewezen in ops/gcsopslag.ts.

   ------------------------------------------------------------
   DE PROPERTY WORDT ONTDEKT, NIET GERADEN

   Drie documenten in deze repository spraken elkaar tegen over het
   propertytype: R2-GSC-TOEGANG.md zei URL-prefix met een expliciete
   afwijzing van de domeinproperty, seo-meetplan zei domeinproperty en
   'hoeft niet gewijzigd te worden', en seo-release-3-2 noemde het nog
   als open actie. Dat is niet uit de repository te beslissen.

   Daarom beslist deze module het ook niet. `ontdekProperties()` vraagt
   het aan Google (sites.list) en `kiesProperty()` heeft drie uitkomsten:
   precies één property -> die; een geconfigureerde voorkeur die in de
   lijst staat -> die; meerdere zonder voorkeur -> WEIGEREN met de lijst
   erbij. Er wordt nooit een property verzonnen, en nooit een
   propertytype aangenomen.

   ------------------------------------------------------------
   DE AUTORISATIE IS IN TWEE STAPPEN, EN DIE ZIJN VERSCHILLEND

   GEMETEN OP 1 NOVEMBER 2026 met het bestaande dienstaccount uit
   INTEL_GCS_SLEUTEL (project vibe-energy-509410):

     JWT-token voor scope webmasters.readonly   -> OK, token verkregen
     JWT-token voor scope analytics.readonly    -> OK, token verkregen
     GET /webmasters/v3/sites                   -> HTTP 403
       "Google Search Console API has not been used in project
        982954656950 before or it is disabled."

   De SLEUTEL werkt dus; de API staat UIT. Dat zijn twee verschillende
   blokkades en ze vragen twee verschillende handelingen:

     1 searchconsole.googleapis.com inschakelen in het GCP-project;
     2 het dienstaccount in Search Console toevoegen aan de property,
       met minstens de machtiging 'Beperkt'. Een GCP-rol geeft die
       toegang NIET.

   Deze module onderscheidt die twee in zijn uitkomst, want 'het werkt
   niet' is voor een eigenaar geen bruikbaar antwoord.

   ------------------------------------------------------------
   HTTP 200 IS GEEN INDEXATIE, EN DAT IS HIER AFGEDWONGEN

   De opdracht eist vier onderscheiden toestanden. Zo liggen ze vast:

     technisch bereikbaar    indexatie_status.http_status = 200,
                             bron 'eigen_meting'
     in een sitemap          indexatie_status.in_sitemap = true
     indexatie VASTGESTELD   indexatie_status.geindexeerd = 'ja',
                             bron 'gsc' -- alleen deze module schrijft dat
     indexatie ONBEKEND      geindexeerd = 'onbekend'

   De eigen live-meting zet `geindexeerd` hard op 'onbekend' en `bron` op
   'eigen_meting'; alleen een GSC-waarneming mag 'ja' of 'nee' zetten, en
   alleen met bron 'gsc'. De CHECK in migratie 0006 dwingt het
   waardenbereik af, `bewaakScheiding()` in koppelingen.ts gooit bij
   vermenging, en de unieke sleutel op (organisatie_id, url, bron) houdt
   de twee waarnemingen als APARTE rijen naast elkaar.

   ------------------------------------------------------------
   DRIE CONTRACTREGELS UIT HET SCHEMA DIE HIER WORDEN NAGELEEFD

   1 `positie_som` IS NUL-GEBASEERD. De view intel.zoekvraag_per_vraag
     rekent sum(positie_som)/sum(impressies) + 1. De GSC-API geeft
     `position` 1-GEBASEERD terug, dus de teller is
     (positie - 1) * impressies. Dit één keer verkeerd doen levert een
     gemiddelde positie die er een hele plek naast zit, en niemand ziet
     dat aan het getal.

   2 `positie_conventie` WORDT GEMETEN, niet aangenomen. Komt er een
     positie onder 1 terug, dan kan de bron niet 1-gebaseerd zijn.
     Zonder rijen blijft het 'onbekend'.

   3 `epoch_versie` DEKT EEN HERVERWERKTE DAG. Google rekent een dag soms
     opnieuw; een hogere epoch vervangt die dag. Bij een hersynchronisatie
     van dezelfde datum gaat de epoch dus omhoog in plaats van dat de
     rijen stil worden overschreven met hetzelfde nummer.

   ------------------------------------------------------------
   EN DE DEKKING WORDT APART VASTGELEGD

   intel.analytics_dekking bestond met nul rijen en zonder schrijver.
   Zonder die registratie is 'geen rij' niet te onderscheiden van 'nul
   vertoningen' — precies de verwarring die deze hele laag wil
   voorkomen. Elke ronde schrijft daarom wat er WERKELIJK is opgehaald:
   het venster, het aantal rijen, of de respons is afgekapt, en of de
   periode volledig is.
   ============================================================ */

import { createSign } from "node:crypto";
import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("gsc");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SITES_URL = "https://searchconsole.googleapis.com/webmasters/v3/sites";
const ZOEK_URL = "https://searchconsole.googleapis.com/webmasters/v3/sites";

/** Alleen lezen. Deze module schrijft nooit naar Search Console. */
export const GSC_BEREIK = "https://www.googleapis.com/auth/webmasters.readonly";

/** De bronnaam in intel.zoekvraag_metingen en intel.indexatie_status. */
export const GSC_BRON = "gsc";

/**
 * GSC levert maximaal 25.000 rijen per verzoek. Boven dat aantal is de
 * respons AFGEKAPT, en dat moet in de dekking staan — een afgekapte dag
 * die als volledig wordt geregistreerd is een stille ondertelling.
 */
const RIJEN_PER_VERZOEK = 25_000;

/**
 * GSC-data is pas na ongeveer twee dagen compleet. Een synchronisatie
 * die tot vandaag loopt, legt daarom een periode vast die Google later
 * nog bijwerkt — en dat is precies waar `epoch_versie` voor is. De
 * standaard laat de laatste twee dagen met opzet staan.
 */
export const VERTRAGING_DAGEN = 2;

export type GscToegang =
  | { readonly soort: "geen"; readonly reden: string }
  | {
      readonly soort: "sleutel";
      readonly clientEmail: string;
      /** NIET-OPSOMBAAR. Zie maakSleutelToegang() voor de reden. */
      readonly privateKey: string;
      /** Uit INTEL_GSC_SITE_URL; een VOORKEUR, geen aanname. */
      readonly voorkeur: string | null;
      /** Waar de sleutel vandaan komt, voor het rapport. */
      readonly herkomst: "INTEL_GSC_PRIVATE_KEY" | "INTEL_GCS_SLEUTEL";
      /** Geeft een geredigeerde vorm, zodat serialiseren niet kan lekken. */
      toJSON(): object;
    };

/** Railway-variabelen verliezen echte newlines; \n als twee tekens is een val. */
function herstelNewlines(sleutel: string): string {
  return sleutel.includes("\\n") ? sleutel.replace(/\\n/g, "\n") : sleutel;
}

/** Wat er in de plaats van de sleutel komt te staan. */
export const SLEUTEL_VERBORGEN = "[sleutel weggelaten]";

/**
 * Bouwt de toegang zó dat de sleutel NIET UIT TE PRINTEN is.
 *
 * DIT IS EEN INCIDENTREPARATIE EN GEEN VERFRAAIING. Op 1 november 2026
 * heeft een wegwerp-diagnosescript de privésleutel van dit dienstaccount
 * naar een terminal geschreven, met één regel:
 *
 *     if (t.soort !== "ok") console.log(JSON.stringify(t));
 *
 * Twee dingen gingen daar samen fout. De bewaking vertakte op "ok",
 * terwijl de geslaagde tak van dit type `"sleutel"` heet — dus liep een
 * GESLAAGDE lezing de faaltak in. En die faaltak stringifyde het hele
 * object. De redactielaag in kern/geheimen.ts was niet in het spel: een
 * ad-hoc script roept die niet aan, en dat zal het volgende script ook
 * niet doen.
 *
 * Daarom zit de bescherming nu IN HET OBJECT in plaats van in de
 * discipline van de aanroeper. Twee lagen, want ze dekken verschillende
 * wegen:
 *
 *   privateKey is NIET-OPSOMBAAR — JSON.stringify slaat hem over, een
 *   spread kopieert hem niet mee, en util.inspect (wat console.log op
 *   een object doet) toont niet-opsombare velden alleen met showHidden;
 *
 *   toJSON() geeft een expliciet geredigeerde vorm — zodat wie het
 *   object tóch serialiseert een leesbare afdruk krijgt mét de melding
 *   dat er iets is weggelaten, in plaats van een object dat stil
 *   onvolledig is.
 *
 * De sleutel blijft gewoon te LEZEN als `toegang.privateKey`. Niet
 * opsombaar is niet onbereikbaar; gscToken() werkt onveranderd.
 */
function maakSleutelToegang(
  clientEmail: string,
  privateKey: string,
  voorkeur: string | null,
  herkomst: "INTEL_GSC_PRIVATE_KEY" | "INTEL_GCS_SLEUTEL",
): Extract<GscToegang, { soort: "sleutel" }> {
  const zichtbaar = { soort: "sleutel" as const, clientEmail, voorkeur, herkomst };
  Object.defineProperty(zichtbaar, "privateKey", {
    value: privateKey,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(zichtbaar, "toJSON", {
    value: () => ({ ...zichtbaar, privateKey: SLEUTEL_VERBORGEN }),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return zichtbaar as Extract<GscToegang, { soort: "sleutel" }>;
}

/**
 * Leest de credential, uit twee mogelijke bronnen.
 *
 * EERST de eigen variabelen (INTEL_GSC_CLIENT_EMAIL +
 * INTEL_GSC_PRIVATE_KEY). Die horen hier, want een eigen credential kan
 * met de minimale machtiging worden uitgegeven.
 *
 * DAN, als die ontbreken, het BESTAANDE dienstaccount uit
 * INTEL_GCS_SLEUTEL. Dat is geen omweg maar precies wat de opdracht
 * vraagt — 'controleer via bestaande geautoriseerde Google-koppelingen'
 * — en het is gemeten: dezelfde sleutel krijgt een geldig token voor de
 * webmasters-scope. Of hij ook PROPERTYTOEGANG heeft is een tweede
 * vraag, en die beantwoordt Google zelf in ontdekProperties().
 *
 * De herkomst gaat mee in de uitkomst, zodat een rapport kan zeggen
 * WELKE identiteit er is gebruikt. Dat is geen detail: de twee accounts
 * kunnen verschillende machtigingen in Search Console hebben.
 */
export function gscToegang(): GscToegang {
  const voorkeurRuw = (process.env["INTEL_GSC_SITE_URL"] ?? "").trim();
  const voorkeur = voorkeurRuw === "" ? null : voorkeurRuw;

  const eigenEmail = (process.env["INTEL_GSC_CLIENT_EMAIL"] ?? "").trim();
  const eigenKey = (process.env["INTEL_GSC_PRIVATE_KEY"] ?? "").trim();
  if (eigenEmail !== "" && eigenKey !== "") {
    return maakSleutelToegang(
      eigenEmail,
      herstelNewlines(eigenKey),
      voorkeur,
      "INTEL_GSC_PRIVATE_KEY",
    );
  }

  const gcsRuw = (process.env["INTEL_GCS_SLEUTEL"] ?? "").trim();
  if (gcsRuw !== "") {
    let sleutel: { client_email?: string; private_key?: string; type?: string };
    try {
      sleutel = JSON.parse(gcsRuw) as typeof sleutel;
    } catch {
      return {
        soort: "geen",
        reden:
          "INTEL_GSC_* ontbreekt en INTEL_GCS_SLEUTEL is geen geldige JSON, dus er is geen " +
          "bruikbare Google-identiteit.",
      };
    }
    if (sleutel.type === "service_account" && sleutel.client_email && sleutel.private_key) {
      return maakSleutelToegang(
        sleutel.client_email,
        herstelNewlines(sleutel.private_key),
        voorkeur,
        "INTEL_GCS_SLEUTEL",
      );
    }
  }

  return {
    soort: "geen",
    reden:
      "Geen Google-identiteit beschikbaar. Zet INTEL_GSC_CLIENT_EMAIL en " +
      "INTEL_GSC_PRIVATE_KEY, of maak de bestaande dienstaccountsleutel " +
      "INTEL_GCS_SLEUTEL op deze service beschikbaar.",
  };
}

function base64url(b: Buffer | string): string {
  return Buffer.from(b).toString("base64url");
}

/**
 * Wisselt de sleutel om voor een toegangstoken met de GSC-leesscope.
 *
 * Dezelfde JWT-bearer-stroom als ops/gcsopslag.ts, met één verschil dat
 * telt: de scope. Een token is een uur geldig en wordt niet bewaard.
 */
export async function gscToken(
  toegang: Extract<GscToegang, { soort: "sleutel" }>,
  nu: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const kop = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const lading = base64url(
    JSON.stringify({
      iss: toegang.clientEmail,
      scope: GSC_BEREIK,
      aud: TOKEN_URL,
      iat: nu,
      exp: nu + 3600,
    }),
  );
  const tekenaar = createSign("RSA-SHA256");
  tekenaar.update(`${kop}.${lading}`);
  const jwt = `${kop}.${lading}.${base64url(tekenaar.sign(toegang.privateKey))}`;

  const antwoord = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!antwoord.ok) {
    /* De fouttekst van Google kan de private key niet bevatten, maar wel
       het e-mailadres van het dienstaccount; dat is geen geheim. */
    const tekst = (await antwoord.text()).slice(0, 300);
    throw new IntelFout(
      "netwerk",
      `GSC-token geweigerd (HTTP ${antwoord.status}): ${tekst}`,
      { herhaalbaar: antwoord.status >= 500 },
    );
  }
  const body = (await antwoord.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new IntelFout("netwerk", "GSC-token: de respons bevatte geen access_token");
  }
  return body.access_token;
}

export type Property = {
  readonly siteUrl: string;
  readonly machtiging: string;
  /** Afgeleid uit de vorm van siteUrl, niet aangenomen. */
  readonly soort: "domein" | "url_prefix";
};

export type PropertyUitkomst =
  | { readonly soort: "ok"; readonly properties: readonly Property[] }
  /** De API staat uit in het project. Eén handeling, buiten dit platform. */
  | {
      readonly soort: "api_uit";
      readonly project: string | null;
      readonly inschakelUrl: string | null;
      readonly bericht: string;
    }
  /** De API werkt, maar deze identiteit mag geen enkele property zien. */
  | { readonly soort: "geen_propertytoegang"; readonly identiteit: string }
  | { readonly soort: "fout"; readonly status: number; readonly bericht: string };

/** Domein- of URL-prefixproperty, afgeleid uit de vorm. */
export function propertySoort(siteUrl: string): "domein" | "url_prefix" {
  return siteUrl.startsWith("sc-domain:") ? "domein" : "url_prefix";
}

/**
 * Vraagt Google WELKE properties deze identiteit mag zien.
 *
 * Dit is de enige plek waar het propertytype vandaan kan komen. De
 * uitkomst onderscheidt de drie blokkades die een eigenaar los moet
 * oplossen; zie de kop.
 */
export async function ontdekProperties(token: string): Promise<PropertyUitkomst> {
  const antwoord = await fetch(SITES_URL, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  const tekst = await antwoord.text();

  if (antwoord.status === 403) {
    /* TWEE HEEL VERSCHILLENDE 403'EN, en ze mogen niet op één hoop.
       'API has not been used in project X before or it is disabled' is
       een projectinstelling; alles anders is een machtiging op de
       property. De eerste los je op in de Cloud Console, de tweede in
       Search Console. */
    if (/has not been used in project|is disabled/i.test(tekst)) {
      const project = /project (\d+)/.exec(tekst)?.[1] ?? null;
      const url = /(https:\/\/console\.developers\.google\.com\S*?)(?:\s|"|$)/.exec(tekst)?.[1] ?? null;
      return {
        soort: "api_uit",
        project,
        inschakelUrl: url,
        bericht:
          `De Google Search Console API staat UIT in het GCP-project` +
          `${project ? ` ${project}` : ""}. De sleutel werkt wel: het token is verkregen. ` +
          `Schakel searchconsole.googleapis.com in en draai deze synchronisatie opnieuw.`,
      };
    }
    return {
      soort: "fout",
      status: 403,
      bericht: `GSC weigerde met 403: ${tekst.slice(0, 300)}`,
    };
  }

  if (!antwoord.ok) {
    return {
      soort: "fout",
      status: antwoord.status,
      bericht: `GSC sites.list gaf HTTP ${antwoord.status}: ${tekst.slice(0, 300)}`,
    };
  }

  const body = JSON.parse(tekst) as {
    siteEntry?: { siteUrl?: string; permissionLevel?: string }[];
  };
  const properties = (body.siteEntry ?? [])
    .filter((e): e is { siteUrl: string; permissionLevel?: string } => typeof e.siteUrl === "string")
    .map((e) => ({
      siteUrl: e.siteUrl,
      machtiging: e.permissionLevel ?? "onbekend",
      soort: propertySoort(e.siteUrl),
    }));

  if (properties.length === 0) {
    return { soort: "geen_propertytoegang", identiteit: "" };
  }
  return { soort: "ok", properties };
}

export type PropertyKeuze =
  | { readonly soort: "gekozen"; readonly property: Property; readonly grond: string }
  | { readonly soort: "onbeslist"; readonly properties: readonly Property[]; readonly reden: string };

/**
 * Kiest de property, of WEIGERT met de lijst erbij.
 *
 * ER WORDT NOOIT GERADEN. Drie gevallen, in deze orde:
 *
 *   1 een geconfigureerde voorkeur die ECHT in de lijst staat -> die;
 *   2 precies één property -> die, want dan is er niets te kiezen;
 *   3 meerdere zonder voorkeur -> ONBESLIST, met de hele lijst, zodat
 *     een mens kiest en de keuze daarna in INTEL_GSC_SITE_URL staat.
 *
 * Geval 3 is met opzet geen 'neem de eerste'. Een domeinproperty en een
 * URL-prefixproperty op hetzelfde domein meten verschillende dingen, en
 * stil de verkeerde kiezen levert een dashboard dat klopt behalve in de
 * getallen.
 */
export function kiesProperty(
  properties: readonly Property[],
  voorkeur: string | null,
): PropertyKeuze {
  if (voorkeur !== null) {
    const exact = properties.find((p) => p.siteUrl === voorkeur);
    if (exact) {
      return {
        soort: "gekozen",
        property: exact,
        grond: `INTEL_GSC_SITE_URL noemt ${voorkeur} en die property bestaat`,
      };
    }
    return {
      soort: "onbeslist",
      properties,
      reden:
        `INTEL_GSC_SITE_URL staat op '${voorkeur}', maar die property bestaat niet voor deze ` +
        `identiteit. Beschikbaar: ${properties.map((p) => p.siteUrl).join(", ")}. ` +
        `Er wordt NIET stil een andere gekozen: een domeinproperty en een URL-prefixproperty ` +
        `meten verschillende dingen.`,
    };
  }
  if (properties.length === 1) {
    const enige = properties[0]!;
    return {
      soort: "gekozen",
      property: enige,
      grond: `er is precies één property (${enige.siteUrl}, ${enige.soort}), dus er valt niets te kiezen`,
    };
  }
  return {
    soort: "onbeslist",
    properties,
    reden:
      `er zijn ${properties.length} properties en INTEL_GSC_SITE_URL is niet gezet: ` +
      `${properties.map((p) => `${p.siteUrl} (${p.soort}, ${p.machtiging})`).join(", ")}. ` +
      `Zet de gewenste property in INTEL_GSC_SITE_URL.`,
  };
}

export type ZoekvraagRij = {
  readonly zoekvraag: string;
  /**
   * De host uit de pagina-URL.
   *
   * ONMISBAAR BIJ EEN DOMEINPROPERTY. `sc-domain:` dekt elke host onder
   * het domein, en deze property leverde er in het eerste echte venster
   * drie: www, de apex en dashboard.vibeenergy.nl. Zonder de host vallen
   * `www.../` en `dashboard.../` samen op pad `/`.
   */
  readonly paginaHost: string | null;
  readonly paginaPad: string | null;
  readonly land: string | null;
  readonly apparaat: string | null;
  readonly datum: string;
  readonly impressies: number;
  readonly kliks: number;
  /** Zoals GSC hem geeft: 1-gebaseerd. De omrekening gebeurt bij het opslaan. */
  readonly positie: number;
};

export type ZoekvraagOogst = {
  readonly rijen: readonly ZoekvraagRij[];
  readonly afgekapt: boolean;
};

/**
 * Voegt rijen samen die op dezelfde databasesleutel landen.
 *
 * WAAROM DIT VÓÓR HET SCHRIJVEN MOET. De upsert overschrijft
 * (`impressies = excluded.impressies`), en dat is juist: een
 * hersynchronisatie van dezelfde dag mag niet optellen, anders
 * verdubbelt elke ronde. Maar overschrijven binnen ÉÉN oogst betekent
 * dat de laatst geschreven rij de vorige wegvaagt, en dan is de
 * uitkomst afhankelijk van de volgorde waarin Google zijn rijen zet.
 *
 * Dat is op 5 november 2026 gemeten en het was geen theorie: negen
 * sleutels botsten, 14 impressies en 2 kliks gingen verloren, en de
 * twee verdwenen kliks waren merkkliks op de homepage die werden
 * weggeschreven door een rij van `dashboard.vibeenergy.nl`.
 *
 * Met de host in de sleutel botsen die twee niet meer. Deze functie is
 * de tweede verdedigingslinie: wat er ná de hostcorrectie nog op één
 * sleutel landt, wordt OPGETELD in plaats van weggegooid. Daarmee is
 * het schrijven orde-onafhankelijk en dus werkelijk idempotent — zelfde
 * oogst in, zelfde tabel uit, ongeacht de volgorde.
 *
 * De positie wordt IMPRESSIEGEWOGEN samengevoegd, niet gemiddeld: een
 * rij met 100 impressies op positie 3 en een rij met 1 impressie op
 * positie 90 leveren samen positie 3,9 en niet 46,5.
 */
export function voegSamen(rijen: readonly ZoekvraagRij[]): ZoekvraagRij[] {
  const SCHEIDER = String.fromCharCode(31); // unit separator: komt in geen URL of zoekvraag voor
  const samen = new Map<string, { rij: ZoekvraagRij; positieMaalImpressies: number }>();
  for (const r of rijen) {
    const sleutel = [r.datum, r.zoekvraag, r.paginaHost, r.paginaPad, r.land, r.apparaat].join(SCHEIDER);
    const bestaand = samen.get(sleutel);
    if (bestaand === undefined) {
      samen.set(sleutel, { rij: r, positieMaalImpressies: r.positie * r.impressies });
      continue;
    }
    const impressies = bestaand.rij.impressies + r.impressies;
    const positieMaalImpressies = bestaand.positieMaalImpressies + r.positie * r.impressies;
    samen.set(sleutel, {
      rij: {
        ...bestaand.rij,
        impressies,
        kliks: bestaand.rij.kliks + r.kliks,
        positie: impressies > 0 ? positieMaalImpressies / impressies : bestaand.rij.positie,
      },
      positieMaalImpressies,
    });
  }
  return [...samen.values()].map((v) => v.rij);
}

/**
 * Haalt Search Analytics op, met de dimensies die de tabel kent.
 *
 * `date` zit er ALTIJD bij. Zonder die dimensie geeft Google één
 * totaalrij over de hele periode, en dan is er geen trend op te bouwen
 * en is `datum` in de tabel een leugen.
 */
export async function haalZoekvragen(
  token: string,
  siteUrl: string,
  vanaf: string,
  tot: string,
  opties: { readonly maxRijen?: number } = {},
): Promise<ZoekvraagOogst> {
  const limiet = Math.min(opties.maxRijen ?? RIJEN_PER_VERZOEK, RIJEN_PER_VERZOEK);
  const url = `${ZOEK_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const antwoord = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      startDate: vanaf,
      endDate: tot,
      dimensions: ["date", "query", "page", "country", "device"],
      rowLimit: limiet,
      dataState: "final",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const tekst = await antwoord.text();
  if (!antwoord.ok) {
    throw new IntelFout(
      "netwerk",
      `GSC searchAnalytics gaf HTTP ${antwoord.status}: ${tekst.slice(0, 300)}`,
      { herhaalbaar: antwoord.status >= 500 || antwoord.status === 429 },
    );
  }
  const body = JSON.parse(tekst) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
  };
  const ruw = body.rows ?? [];
  const uit: ZoekvraagRij[] = [];
  for (const r of ruw) {
    const k = r.keys ?? [];
    if (k.length < 5) continue;
    /* HOST EN PAD APART. Tot 5 november 2026 bewaarde deze functie
       alleen het pad, en bij een domeinproperty gooide dat de host van
       een ándere applicatie op hetzelfde pad. Valt de URL niet te
       ontleden, dan blijft de host null en gaat de hele waarde als pad
       mee — liever een onhandig pad dan een verzonnen host. */
    const { host, pad } = (() => {
      try {
        const u = new URL(k[2]!);
        return { host: u.host, pad: u.pathname };
      } catch {
        return { host: null, pad: k[2] ?? null };
      }
    })();
    uit.push({
      datum: k[0]!,
      zoekvraag: k[1]!,
      paginaHost: host,
      paginaPad: pad,
      land: k[3] ?? null,
      apparaat: k[4] ?? null,
      impressies: Math.round(r.impressions ?? 0),
      kliks: Math.round(r.clicks ?? 0),
      positie: r.position ?? 0,
    });
  }
  return { rijen: voegSamen(uit), afgekapt: ruw.length >= limiet };
}

export type PropertyTotaal = {
  readonly kliks: number;
  readonly impressies: number;
  readonly ctr: number;
  /** 1-gebaseerd, zoals Google hem geeft. */
  readonly positie: number;
};

/**
 * Het totaal van de property, ZONDER dimensies.
 *
 * DIT IS EEN ANDER GETAL DAN DE SOM VAN DE DETAILLAAG, en dat verschil
 * is de reden dat deze functie bestaat. Google anonimiseert zeldzame
 * zoekvragen en laat ze uit elke gedimensioneerde respons weg. Op
 * 5 november 2026 gemeten over 2026-10-06 t/m 2026-11-03, dezelfde
 * property, dezelfde dag:
 *
 *     zonder dimensies      126 kliks   9.891 impressies
 *     dimensie query         57 kliks   6.410 impressies
 *     onze detailtabel       55 kliks   7.113 impressies
 *
 * De detaillaag haalde dus 44% van de kliks en 72% van de impressies.
 * Wie het detailtotaal als sitetotaal leest, zit er ruim een factor
 * twee naast. Daarom wordt dit totaal apart opgeslagen en apart getoond.
 *
 * Geeft null als Google geen totaalrij levert. NULL IS GEEN NUL: het
 * betekent dat het totaal niet is gemeten, en de dekkingsgraad blijft
 * dan onbekend in plaats van 100%.
 */
export async function haalPropertyTotaal(
  token: string,
  siteUrl: string,
  vanaf: string,
  tot: string,
): Promise<PropertyTotaal | null> {
  const url = `${ZOEK_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const antwoord = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startDate: vanaf, endDate: tot, dataState: "final" }),
    signal: AbortSignal.timeout(60_000),
  });
  const tekst = await antwoord.text();
  if (!antwoord.ok) {
    throw new IntelFout(
      "netwerk",
      `GSC propertytotaal gaf HTTP ${antwoord.status}: ${tekst.slice(0, 300)}`,
      { herhaalbaar: antwoord.status >= 500 || antwoord.status === 429 },
    );
  }
  const body = JSON.parse(tekst) as {
    rows?: { clicks?: number; impressions?: number; ctr?: number; position?: number }[];
  };
  const r = body.rows?.[0];
  if (r === undefined) return null;
  return {
    kliks: Math.round(r.clicks ?? 0),
    impressies: Math.round(r.impressions ?? 0),
    ctr: r.ctr ?? 0,
    positie: r.position ?? 0,
  };
}

/**
 * Welke positieconventie draagt deze oogst? GEMETEN, niet aangenomen.
 *
 * De GSC-API documenteert `position` als 1-gebaseerd, maar dit platform
 * schrijft die aanname niet in de database. Komt er een positie ONDER 1
 * terug, dan kan de bron niet 1-gebaseerd zijn. Zonder rijen blijft het
 * 'onbekend', en dan toont het dashboard de positie zonder
 * rangordeconclusie.
 */
export function meetConventie(
  rijen: readonly ZoekvraagRij[],
): "een_gebaseerd" | "nul_gebaseerd" | "onbekend" {
  const metPositie = rijen.filter((r) => Number.isFinite(r.positie) && r.positie > 0);
  if (metPositie.length === 0) return "onbekend";
  return metPositie.some((r) => r.positie < 1) ? "nul_gebaseerd" : "een_gebaseerd";
}

export type SyncUitkomst =
  | {
      readonly soort: "gesynchroniseerd";
      readonly property: string;
      readonly propertySoort: "domein" | "url_prefix";
      readonly identiteit: string;
      readonly vanaf: string;
      readonly tot: string;
      readonly rijen: number;
      readonly geschreven: number;
      readonly afgekapt: boolean;
      readonly conventie: string;
      readonly epoch: number;
      /** Hoeveel legacyrijen zonder host zijn opgeruimd; zie de sync. */
      readonly opgeruimd: number;
      /** Het propertytotaal, of null als Google er geen gaf. NULL IS GEEN NUL. */
      readonly propertyTotaal: PropertyTotaal | null;
      /** Wat de detaillaag voor dit venster draagt, om naast het totaal te zetten. */
      readonly detailKliks: number;
      readonly detailImpressies: number;
      /** Impressies per host, zodat twee applicaties nooit in één getal zitten. */
      readonly perHost: Readonly<Record<string, number>>;
    }
  /** Een BENOEMDE weigering. Nooit een nulresultaat; zie de kop. */
  | { readonly soort: "geblokkeerd"; readonly fase: string; readonly reden: string };

/** De dag n dagen terug, in ISO-datumvorm. */
function dagTerug(dagen: number, vanaf: Date): string {
  const d = new Date(vanaf.getTime() - dagen * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * De volledige dagelijkse synchronisatie.
 *
 * GEEN ENKELE FOUT WORDT EEN NUL. Elke blokkade levert
 * `{soort:"geblokkeerd"}` met de fase en de reden, en er wordt dan ook
 * GEEN dekkingsrij geschreven — want een dekkingsrij met nul rijen zou
 * beweren dat de periode is opgehaald en leeg was. Dat is precies het
 * verschil dat intel.analytics_dekking moet bewaken.
 */
export async function synchroniseerGsc(
  pool: Pool,
  organisatieId: number,
  opties: {
    readonly dagen?: number;
    readonly nu?: Date;
    readonly droog?: boolean;
    readonly maxRijen?: number;
  } = {},
): Promise<SyncUitkomst> {
  /* ELKE BLOKKADE WORDT OOK IN HET KOPPELINGENREGISTER GELEGD, met de
     juiste van drie toestanden. Tot 5 november 2026 schreef deze
     functie bij een blokkade NIETS naar het register, en daardoor bleef
     daar de env-afleiding van een andere dienst staan — die zei
     'niet geconfigureerd' terwijl het werkelijke probleem een
     ontbrekende machtiging in Search Console was.

       bereikbaar  het token werkt en Google antwoordt, maar er komt
                   niets: een ontbrekende machtiging of een uitstaande
                   API. Er is niets stuk; er mist een handeling.
       fout        een echte storing in de aanroep.
       (niets)     bij fase 'credential' laten we het register staan:
                   deze dienst heeft de sleutel niet, en dat mag de
                   stand van een dienst die hem wél heeft niet raken. */
  const blokkade = async (
    fase: string,
    reden: string,
    soort: "bereikbaar" | "fout" | "stil",
  ): Promise<SyncUitkomst> => {
    if (soort !== "stil") {
      try {
        const { legVastKoppelingBewijs } = await import("./koppelingen.ts");
        await metOrganisatie(pool, { organisatieId }, (c) =>
          legVastKoppelingBewijs(c, organisatieId, GSC_BRON, {
            status: soort,
            bewijs: `fase '${fase}': ${reden}`,
            door: "synchroniseerGsc",
          }),
        );
      } catch (e) {
        /* Een registerschrijf die faalt mag de benoemde blokkade niet
           vervangen door een databasefout: de blokkade is het antwoord. */
        log.waarschuwing("koppelingbewijs niet vastgelegd", {
          fase,
          reden: e instanceof Error ? e.message.slice(0, 160) : String(e),
        });
      }
    }
    return { soort: "geblokkeerd", fase, reden };
  };

  const toegang = gscToegang();
  if (toegang.soort === "geen") {
    return blokkade("credential", toegang.reden, "stil");
  }

  let token: string;
  try {
    token = await gscToken(toegang);
  } catch (e) {
    return blokkade("token", e instanceof Error ? e.message : String(e), "fout");
  }

  const props = await ontdekProperties(token);
  if (props.soort === "api_uit") {
    return blokkade("api_uit", props.bericht, "bereikbaar");
  }
  if (props.soort === "geen_propertytoegang") {
    return blokkade(
      "propertytoegang",
      `De API werkt en het token is geldig, maar ${toegang.clientEmail} ziet GEEN enkele ` +
        `property. Voeg dat dienstaccount in Search Console toe aan de property met minstens ` +
        `de machtiging 'Beperkt'. Een GCP-rol geeft die toegang niet.`,
      "bereikbaar",
    );
  }
  if (props.soort === "fout") {
    return blokkade("sites.list", props.bericht, "fout");
  }

  const keuze = kiesProperty(props.properties, toegang.voorkeur);
  if (keuze.soort === "onbeslist") {
    return blokkade("propertykeuze", keuze.reden, "bereikbaar");
  }

  const nu = opties.nu ?? new Date();
  const tot = dagTerug(opties.dagen === undefined ? VERTRAGING_DAGEN : VERTRAGING_DAGEN, nu);
  const vanaf = dagTerug((opties.dagen ?? 28) + VERTRAGING_DAGEN, nu);

  let oogst: ZoekvraagOogst;
  try {
    oogst = await haalZoekvragen(token, keuze.property.siteUrl, vanaf, tot, {
      ...(opties.maxRijen === undefined ? {} : { maxRijen: opties.maxRijen }),
    });
  } catch (e) {
    return blokkade("searchAnalytics", e instanceof Error ? e.message : String(e), "fout");
  }

  /* HET PROPERTYTOTAAL, in een eigen try. Mislukt dit, dan is de
     detailoogst nog steeds geldig en hoort hij opgeslagen te worden —
     met het totaal op null, want een niet-gemeten totaal is geen nul.
     De blokkade van de hele ronde zou hier onevenredig zijn. */
  let propertyTotaal: PropertyTotaal | null = null;
  let totaalFout: string | null = null;
  try {
    propertyTotaal = await haalPropertyTotaal(token, keuze.property.siteUrl, vanaf, tot);
  } catch (e) {
    totaalFout = e instanceof Error ? e.message : String(e);
    log.waarschuwing("gsc propertytotaal niet opgehaald", { reden: totaalFout.slice(0, 200) });
  }

  const conventie = meetConventie(oogst.rijen);
  const detailKliks = oogst.rijen.reduce((s, r) => s + Math.min(r.kliks, r.impressies), 0);
  const detailImpressies = oogst.rijen.reduce((s, r) => s + r.impressies, 0);
  const perHost: Record<string, number> = {};
  for (const r of oogst.rijen) {
    const h = r.paginaHost ?? "(host onbekend)";
    perHost[h] = (perHost[h] ?? 0) + r.impressies;
  }

  const basis = {
    soort: "gesynchroniseerd" as const,
    property: keuze.property.siteUrl,
    propertySoort: keuze.property.soort,
    identiteit: toegang.clientEmail,
    vanaf,
    tot,
    rijen: oogst.rijen.length,
    afgekapt: oogst.afgekapt,
    conventie,
    propertyTotaal,
    detailKliks,
    detailImpressies,
    perHost,
  };

  if (opties.droog === true) {
    return { ...basis, geschreven: 0, epoch: 0, opgeruimd: 0 };
  }

  const uit = await metOrganisatie(pool, { organisatieId }, async (c) => {
    /* DE EPOCH GAAT OMHOOG BIJ EEN HERSYNCHRONISATIE van een dag die er
       al staat. Google rekent een dag soms opnieuw, en dan is de nieuwe
       waarneming de geldige. Zonder deze teller zou een herverwerkte dag
       stil met hetzelfde nummer worden overschreven en was er geen spoor
       dat er twee waarnemingen waren. */
    const bestaand = await eenRij<{ epoch: number }>(
      c,
      `select coalesce(max(epoch_versie), -1) as epoch
         from intel.zoekvraag_metingen
        where organisatie_id = $1 and bron = $2 and datum between $3::date and $4::date`,
      [organisatieId, GSC_BRON, vanaf, tot],
    );
    const epoch = (bestaand?.epoch ?? -1) + 1;

    /* DE LEGACYRIJEN ZONDER HOST MOETEN WEG, en alleen zij.

       Vóór migratie 0050 had de sleutel geen host. Die rijen hebben
       pagina_host NULL, en omdat de nieuwe sleutel NULLS NOT DISTINCT
       gebruikt is een rij met host een ANDERE sleutel dan dezelfde rij
       zonder host. Zonder deze opruiming zouden oud en nieuw naast
       elkaar blijven staan en zou elke som dubbel tellen.

       DRIE GRENZEN, zodat dit nooit meer dan het bedoelde raakt:
         * alleen deze bron en dit venster;
         * alleen rijen met pagina_host IS NULL;
         * alleen als de huidige oogst werkelijk hosts bevat — anders
           zou een respons met onontleedbare URL's goede rijen wissen
           en er host-loze voor terugzetten.

       Na de eerste geslaagde ronde is dit een no-op: er zijn dan geen
       host-loze rijen meer in het venster. Het getal gaat mee in de
       uitkomst, zodat zichtbaar is dát er is opgeruimd. */
    const oogstHeeftHosts = oogst.rijen.some((r) => r.paginaHost !== null);
    let opgeruimd = 0;
    if (oogstHeeftHosts) {
      const weg = await c.query(
        `delete from intel.zoekvraag_metingen
          where organisatie_id = $1 and bron = $2
            and datum between $3::date and $4::date
            and pagina_host is null`,
        [organisatieId, GSC_BRON, vanaf, tot],
      );
      opgeruimd = weg.rowCount ?? 0;
      if (opgeruimd > 0) {
        log.info("gsc legacyrijen zonder host opgeruimd", {
          rijen: opgeruimd,
          vanaf,
          tot,
          toelichting:
            "opgehaald vóór migratie 0050; de host was voor die rijen niet te bepalen en " +
            "bij een botsing per definitie ambigu",
        });
      }
    }

    let geschreven = 0;
    for (const r of oogst.rijen) {
      /* DE CONSTRAINT `impressies >= 1` IS GEEN HINDERNIS MAAR EEN
         CONTRACT: een rij met nul vertoningen is geen waarneming. GSC
         levert ze niet, maar een afgeronde 0 uit een rare respons zou
         hier anders een constraintfout geven midden in de ronde. */
      if (r.impressies < 1) continue;
      const kliks = Math.min(r.kliks, r.impressies);
      /* NUL-GEBASEERDE TELLER. Zie contractregel 1 in de kop. */
      const positieSom = (r.positie - 1) * r.impressies;
      await c.query(
        `insert into intel.zoekvraag_metingen
           (organisatie_id, bron, datum, zoekvraag, pagina_host, pagina_pad, land, apparaat,
            impressies, kliks, ctr, gemiddelde_positie, positie_som, positie_conventie,
            epoch_versie, opgehaald_op)
         values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
         on conflict (organisatie_id, bron, datum, zoekvraag, pagina_host, pagina_pad, land, apparaat)
           do update set impressies = excluded.impressies,
                         kliks = excluded.kliks,
                         ctr = excluded.ctr,
                         gemiddelde_positie = excluded.gemiddelde_positie,
                         positie_som = excluded.positie_som,
                         positie_conventie = excluded.positie_conventie,
                         epoch_versie = excluded.epoch_versie,
                         opgehaald_op = now()`,
        [
          organisatieId,
          GSC_BRON,
          r.datum,
          r.zoekvraag,
          r.paginaHost,
          r.paginaPad,
          r.land,
          r.apparaat,
          r.impressies,
          kliks,
          r.impressies > 0 ? kliks / r.impressies : null,
          r.positie,
          positieSom,
          conventie,
          epoch,
        ],
      );
      geschreven += 1;
    }

    /* DE DEKKING, en die is het halve punt van deze module. Zonder deze
       rij is 'geen zoekvraagrij voor 12 oktober' niet te onderscheiden
       van 'nul vertoningen op 12 oktober'. */
    await c.query(
      `insert into intel.analytics_dekking
         (organisatie_id, bron, datum_vanaf, datum_tot, aantal_rijen, afgekapt, volledig,
          opmerking, opgehaald_op)
       values ($1,$2,$3::date,$4::date,$5,$6,$7,$8,now())
       on conflict (organisatie_id, bron, datum_vanaf, datum_tot)
         do update set aantal_rijen = excluded.aantal_rijen,
                       afgekapt = excluded.afgekapt,
                       volledig = excluded.volledig,
                       opmerking = excluded.opmerking,
                       opgehaald_op = now()`,
      [
        organisatieId,
        GSC_BRON,
        vanaf,
        tot,
        oogst.rijen.length,
        oogst.afgekapt,
        /* VOLLEDIG betekent: niet afgekapt EN het venster eindigt vóór
           het vertragingsvenster van Google. Beide moeten waar zijn. */
        !oogst.afgekapt,
        `property ${keuze.property.siteUrl} (${keuze.property.soort}), identiteit ` +
          `${toegang.clientEmail} via ${toegang.herkomst}, grond: ${keuze.grond}, ` +
          `positieconventie ${conventie}, epoch ${epoch}` +
          (oogst.afgekapt
            ? `. AFGEKAPT op ${RIJEN_PER_VERZOEK} rijen: deze periode is een ONDERGRENS.`
            : ""),
      ],
    );

    /* HET PROPERTYTOTAAL NAAST HET DETAILTOTAAL.

       Alleen schrijven als Google werkelijk een totaalrij gaf. Een rij
       met nullen zou beweren dat de property nul kliks had, en dat is
       precies de verwarring die deze tabel moet wegnemen: een
       ontbrekend totaal is geen nul en geen volledige dekking. De view
       intel.analytics_dekkingsgraad laat de aandelen daarom op NULL
       staan zolang er geen totaalrij is. */
    if (propertyTotaal !== null) {
      await c.query(
        `insert into intel.analytics_propertytotalen
           (organisatie_id, bron, property, datum_vanaf, datum_tot,
            kliks, impressies, ctr, positie_som, positie_conventie,
            detail_kliks, detail_impressies, detail_rijen, opmerking, opgehaald_op)
         values ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
         on conflict (organisatie_id, bron, property, datum_vanaf, datum_tot)
           do update set kliks = excluded.kliks,
                         impressies = excluded.impressies,
                         ctr = excluded.ctr,
                         positie_som = excluded.positie_som,
                         positie_conventie = excluded.positie_conventie,
                         detail_kliks = excluded.detail_kliks,
                         detail_impressies = excluded.detail_impressies,
                         detail_rijen = excluded.detail_rijen,
                         opmerking = excluded.opmerking,
                         opgehaald_op = now()`,
        [
          organisatieId,
          GSC_BRON,
          keuze.property.siteUrl,
          vanaf,
          tot,
          propertyTotaal.kliks,
          propertyTotaal.impressies,
          propertyTotaal.ctr,
          /* Dezelfde nul-gebaseerde teller als in zoekvraag_metingen,
             zodat de view op één manier aggregeert. */
          (propertyTotaal.positie - 1) * propertyTotaal.impressies,
          conventie,
          detailKliks,
          detailImpressies,
          geschreven,
          `zonder dimensies opgehaald naast de detaillaag. De detaillaag is een ` +
            `DEELVERZAMELING: Google laat zeldzame zoekvragen uit elke gedimensioneerde ` +
            `respons weg. Hosts in de detaillaag: ${
              Object.entries(perHost)
                .sort((a, b) => b[1] - a[1])
                .map(([h, i]) => `${h} ${i}`)
                .join(", ") || "geen"
            }`,
        ],
      );
    }
    /* HET BEWIJS. Dit is de enige plek waar laatste_sync_op gevuld
       raakt, en zolang dat veld staat laat de zaaier de status met rust.
       Geen rijen is hier geen storing maar ook geen verificatie: dan is
       de koppeling bereikbaar en heeft hij niets geleverd. */
    const { legVastKoppelingBewijs } = await import("./koppelingen.ts");
    await legVastKoppelingBewijs(c, organisatieId, GSC_BRON, {
      status: geschreven > 0 ? "geverifieerd" : "bereikbaar",
      bewijs:
        `${geschreven} rij(en) weggeschreven over ${vanaf} t/m ${tot} voor property ` +
        `${keuze.property.siteUrl} via ${toegang.herkomst}` +
        (propertyTotaal === null
          ? ". Propertytotaal NIET GEMETEN, dus de dekkingsgraad van de detaillaag is onbekend."
          : `. Propertytotaal ${propertyTotaal.kliks} kliks / ${propertyTotaal.impressies} ` +
            `impressies naast detail ${detailKliks} / ${detailImpressies}.`),
      door: "synchroniseerGsc",
    });

    return { geschreven, epoch, opgeruimd };
  });

  log.info("gsc gesynchroniseerd", {
    property: keuze.property.siteUrl,
    property_soort: keuze.property.soort,
    vanaf,
    tot,
    rijen: oogst.rijen.length,
    geschreven: uit.geschreven,
    opgeruimd: uit.opgeruimd,
    afgekapt: oogst.afgekapt,
    conventie,
    epoch: uit.epoch,
    hosts: Object.keys(perHost).length,
    /* HET DETAILTOTAAL NOOIT ZONDER HET PROPERTYTOTAAL loggen: naast
       elkaar is het een dekkingsgraad, los is het een verkeerd getal. */
    detail_kliks: detailKliks,
    detail_impressies: detailImpressies,
    property_kliks: propertyTotaal === null ? "NIET GEMETEN" : propertyTotaal.kliks,
    property_impressies: propertyTotaal === null ? "NIET GEMETEN" : propertyTotaal.impressies,
    ...(totaalFout === null ? {} : { propertytotaal_fout: totaalFout.slice(0, 200) }),
  });
  return { ...basis, geschreven: uit.geschreven, epoch: uit.epoch, opgeruimd: uit.opgeruimd };
}

/**
 * De host waarop de WEBSITE staat.
 *
 * Een domeinproperty dekt elke host onder het domein, inclusief
 * applicaties die geen website zijn — hier gemeten:
 * `dashboard.vibeenergy.nl` en `aanvragen.vibeenergy.nl`. Een
 * websiterapport dat die meetelt, meet iets anders dan de website.
 *
 * Overschrijfbaar met INTEL_GSC_WEBSITE_HOST, want dit hoort niet in
 * een migratie of in SQL te staan: het is configuratie, niet schema.
 */
export function websiteHost(): string {
  const uit = (process.env["INTEL_GSC_WEBSITE_HOST"] ?? "").trim();
  return uit === "" ? "www.vibeenergy.nl" : uit;
}

export type HostStand = {
  readonly host: string | null;
  readonly rijen: number;
  readonly kliks: number;
  readonly impressies: number;
  readonly ctr: number | null;
  readonly positie: number | null;
};

export type DekkingsStand = {
  readonly property: string;
  readonly vanaf: string;
  readonly tot: string;
  readonly propertyKliks: number;
  readonly propertyImpressies: number;
  readonly propertyCtr: number | null;
  readonly propertyPositie: number | null;
  readonly detailKliks: number;
  readonly detailImpressies: number;
  readonly detailRijen: number;
  /** NULL betekent NIET GEMETEN, niet 0% en niet 100%. */
  readonly kliksDekking: number | null;
  readonly impressiesDekking: number | null;
  readonly opgehaaldOp: string;
};

export type GscStand = {
  readonly dekkingsrijen: number;
  readonly zoekvraagrijen: number;
  readonly nieuwsteDatum: string | null;
  readonly laatsteOphaling: string | null;
  readonly afgekapteVensters: number;
  /** Rijen die nog geen host dragen: opgehaald vóór migratie 0050. */
  readonly rijenZonderHost: number;
  /** Per host, zodat website en dashboard nooit in één getal zitten. */
  readonly perHost: readonly HostStand[];
  /** De website apart, op de host uit websiteHost(). */
  readonly website: HostStand | null;
  /**
   * Het nieuwste propertytotaal naast het detailtotaal.
   *
   * NULL betekent: nog geen propertytotaal gemeten. Dan is de
   * dekkingsgraad onbekend en mag het detailtotaal niet als sitetotaal
   * worden gepresenteerd.
   */
  readonly dekking: DekkingsStand | null;
};

/**
 * Wat er van GSC in de database staat. Voor het dashboard en de monitor.
 *
 * NEEMT EEN CLIENT EN GEEN POOL, want hij leest alleen. Dat is geen
 * smaak: meetGezondheid() krijgt een client aangereikt en zou anders
 * een tweede verbinding moeten opzetten binnen een transactie die al
 * loopt.
 */
export async function gscStand(
  c: Pick<pg.PoolClient, "query">,
  organisatieId: number,
): Promise<GscStand> {
  {
    const r = await rijen<{
      dekkingsrijen: string;
      zoekvraagrijen: string;
      nieuwste: string | null;
      laatste: string | null;
      afgekapt: string;
    }>(
      c,
      `select (select count(*) from intel.analytics_dekking
                where organisatie_id = $1 and bron = $2)::text            as dekkingsrijen,
              (select count(*) from intel.zoekvraag_metingen
                where organisatie_id = $1 and bron = $2)::text            as zoekvraagrijen,
              (select max(datum)::text from intel.zoekvraag_metingen
                where organisatie_id = $1 and bron = $2)                  as nieuwste,
              (select max(opgehaald_op)::text from intel.analytics_dekking
                where organisatie_id = $1 and bron = $2)                  as laatste,
              (select count(*) from intel.analytics_dekking
                where organisatie_id = $1 and bron = $2 and afgekapt)::text as afgekapt`,
      [organisatieId, GSC_BRON],
    );
    const x = r[0];

    const zonderHost = await rijen<{ n: string }>(
      c,
      `select count(*)::text as n from intel.zoekvraag_metingen
        where organisatie_id = $1 and bron = $2 and pagina_host is null`,
      [organisatieId, GSC_BRON],
    );

    const hosts = await rijen<{
      pagina_host: string | null;
      rijen: string;
      kliks: string | null;
      impressies: string | null;
      ctr: string | null;
      gemiddelde_positie: string | null;
    }>(
      c,
      `select pagina_host, rijen::text, kliks::text, impressies::text,
              ctr::text, gemiddelde_positie::text
         from intel.zoekvraag_per_host
        where organisatie_id = $1 and bron = $2
        order by impressies desc nulls last`,
      [organisatieId, GSC_BRON],
    );
    const perHost: HostStand[] = hosts.map((h) => ({
      host: h.pagina_host,
      rijen: Number(h.rijen),
      kliks: Number(h.kliks ?? 0),
      impressies: Number(h.impressies ?? 0),
      ctr: h.ctr === null ? null : Number(h.ctr),
      positie: h.gemiddelde_positie === null ? null : Number(h.gemiddelde_positie),
    }));

    const d = await rijen<{
      property: string;
      vanaf: string;
      tot: string;
      property_kliks: string | null;
      property_impressies: string | null;
      property_ctr: string | null;
      property_positie: string | null;
      detail_kliks: string | null;
      detail_impressies: string | null;
      detail_rijen: string | null;
      kliks_dekking: string | null;
      impressies_dekking: string | null;
      opgehaald_op: string;
    }>(
      c,
      `select property, datum_vanaf::text as vanaf, datum_tot::text as tot,
              property_kliks::text, property_impressies::text, property_ctr::text,
              property_positie::text, detail_kliks::text, detail_impressies::text,
              detail_rijen::text, kliks_dekking::text, impressies_dekking::text,
              opgehaald_op::text
         from intel.analytics_dekkingsgraad
        where organisatie_id = $1 and bron = $2
        order by datum_tot desc, opgehaald_op desc
        limit 1`,
      [organisatieId, GSC_BRON],
    );
    const dr = d[0];

    const eigenHost = websiteHost();
    return {
      dekkingsrijen: Number(x?.dekkingsrijen ?? 0),
      zoekvraagrijen: Number(x?.zoekvraagrijen ?? 0),
      nieuwsteDatum: x?.nieuwste ?? null,
      laatsteOphaling: x?.laatste ?? null,
      afgekapteVensters: Number(x?.afgekapt ?? 0),
      rijenZonderHost: Number(zonderHost[0]?.n ?? 0),
      perHost,
      website: perHost.find((h) => h.host === eigenHost) ?? null,
      dekking:
        dr === undefined
          ? null
          : {
              property: dr.property,
              vanaf: dr.vanaf,
              tot: dr.tot,
              propertyKliks: Number(dr.property_kliks ?? 0),
              propertyImpressies: Number(dr.property_impressies ?? 0),
              propertyCtr: dr.property_ctr === null ? null : Number(dr.property_ctr),
              propertyPositie: dr.property_positie === null ? null : Number(dr.property_positie),
              detailKliks: Number(dr.detail_kliks ?? 0),
              detailImpressies: Number(dr.detail_impressies ?? 0),
              detailRijen: Number(dr.detail_rijen ?? 0),
              kliksDekking: dr.kliks_dekking === null ? null : Number(dr.kliks_dekking),
              impressiesDekking:
                dr.impressies_dekking === null ? null : Number(dr.impressies_dekking),
              opgehaaldOp: dr.opgehaald_op,
            },
    };
  }
}
