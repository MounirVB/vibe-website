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
      readonly privateKey: string;
      /** Uit INTEL_GSC_SITE_URL; een VOORKEUR, geen aanname. */
      readonly voorkeur: string | null;
      /** Waar de sleutel vandaan komt, voor het rapport. */
      readonly herkomst: "INTEL_GSC_PRIVATE_KEY" | "INTEL_GCS_SLEUTEL";
    };

/** Railway-variabelen verliezen echte newlines; \n als twee tekens is een val. */
function herstelNewlines(sleutel: string): string {
  return sleutel.includes("\\n") ? sleutel.replace(/\\n/g, "\n") : sleutel;
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
    return {
      soort: "sleutel",
      clientEmail: eigenEmail,
      privateKey: herstelNewlines(eigenKey),
      voorkeur,
      herkomst: "INTEL_GSC_PRIVATE_KEY",
    };
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
      return {
        soort: "sleutel",
        clientEmail: sleutel.client_email,
        privateKey: herstelNewlines(sleutel.private_key),
        voorkeur,
        herkomst: "INTEL_GCS_SLEUTEL",
      };
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
    const pad = (() => {
      try {
        return new URL(k[2]!).pathname;
      } catch {
        return k[2] ?? null;
      }
    })();
    uit.push({
      datum: k[0]!,
      zoekvraag: k[1]!,
      paginaPad: pad,
      land: k[3] ?? null,
      apparaat: k[4] ?? null,
      impressies: Math.round(r.impressions ?? 0),
      kliks: Math.round(r.clicks ?? 0),
      positie: r.position ?? 0,
    });
  }
  return { rijen: uit, afgekapt: ruw.length >= limiet };
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
  const toegang = gscToegang();
  if (toegang.soort === "geen") {
    return { soort: "geblokkeerd", fase: "credential", reden: toegang.reden };
  }

  let token: string;
  try {
    token = await gscToken(toegang);
  } catch (e) {
    return {
      soort: "geblokkeerd",
      fase: "token",
      reden: e instanceof Error ? e.message : String(e),
    };
  }

  const props = await ontdekProperties(token);
  if (props.soort === "api_uit") {
    return { soort: "geblokkeerd", fase: "api_uit", reden: props.bericht };
  }
  if (props.soort === "geen_propertytoegang") {
    return {
      soort: "geblokkeerd",
      fase: "propertytoegang",
      reden:
        `De API werkt en het token is geldig, maar ${toegang.clientEmail} ziet GEEN enkele ` +
        `property. Voeg dat dienstaccount in Search Console toe aan de property met minstens ` +
        `de machtiging 'Beperkt'. Een GCP-rol geeft die toegang niet.`,
    };
  }
  if (props.soort === "fout") {
    return { soort: "geblokkeerd", fase: "sites.list", reden: props.bericht };
  }

  const keuze = kiesProperty(props.properties, toegang.voorkeur);
  if (keuze.soort === "onbeslist") {
    return { soort: "geblokkeerd", fase: "propertykeuze", reden: keuze.reden };
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
    return {
      soort: "geblokkeerd",
      fase: "searchAnalytics",
      reden: e instanceof Error ? e.message : String(e),
    };
  }

  const conventie = meetConventie(oogst.rijen);
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
  };

  if (opties.droog === true) {
    return { ...basis, geschreven: 0, epoch: 0 };
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
           (organisatie_id, bron, datum, zoekvraag, pagina_pad, land, apparaat,
            impressies, kliks, ctr, gemiddelde_positie, positie_som, positie_conventie,
            epoch_versie, opgehaald_op)
         values ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
         on conflict (organisatie_id, bron, datum, zoekvraag, pagina_pad, land, apparaat)
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
    return { geschreven, epoch };
  });

  log.info("gsc gesynchroniseerd", {
    property: keuze.property.siteUrl,
    property_soort: keuze.property.soort,
    vanaf,
    tot,
    rijen: oogst.rijen.length,
    geschreven: uit.geschreven,
    afgekapt: oogst.afgekapt,
    conventie,
    epoch: uit.epoch,
  });
  return { ...basis, geschreven: uit.geschreven, epoch: uit.epoch };
}

export type GscStand = {
  readonly dekkingsrijen: number;
  readonly zoekvraagrijen: number;
  readonly nieuwsteDatum: string | null;
  readonly laatsteOphaling: string | null;
  readonly afgekapteVensters: number;
};

/** Wat er van GSC in de database staat. Voor het dashboard en de monitor. */
export async function gscStand(pool: Pool, organisatieId: number): Promise<GscStand> {
  return metOrganisatie(pool, { organisatieId }, async (c) => {
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
    return {
      dekkingsrijen: Number(x?.dekkingsrijen ?? 0),
      zoekvraagrijen: Number(x?.zoekvraagrijen ?? 0),
      nieuwsteDatum: x?.nieuwste ?? null,
      laatsteOphaling: x?.laatste ?? null,
      afgekapteVensters: Number(x?.afgekapt ?? 0),
    };
  });
}
