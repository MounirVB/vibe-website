/* ============================================================
   EXTERNE BACK-UPOPSLAG — Google Cloud Storage
   ------------------------------------------------------------
   WAAROM DIT BESTAAND BESTAAT

   Railway's eigen back-upschema's zijn op dit plan HARD NUL:
   `subscriptionPlanLimit.volumes.maxBackupsCount` is 0 op `hobby`
   (gemeten via de Railway-API, 12 oktober 2026). De logische back-up
   werkte al en was aantoonbaar terug te zetten, maar schreef naar de
   containerschijf — en die is weg bij de volgende deploy. Er was dus
   bewijs dat een back-up TERUG te zetten is, en geen bewijs dat er
   morgen nog een back-up LIGT.

   WAAROM GEEN @google-cloud/storage

   Dit project heeft precies twee runtime-dependencies: express en pg.
   Dat is een bewuste grens — elke dependency is leesbare code die
   iemand moet vertrouwen. De JSON-API van GCS is een REST-API en de
   ondertekening is RS256 met een sleutel die we al hebben; dat is met
   node:crypto en fetch ongeveer honderd regels. Een SDK van tientallen
   megabytes voor twee HTTP-aanroepen is die grens niet waard.

   WAT DIT NIET DOET

   Verwijderen. De dienstaccount heeft `objectCreator` en
   `objectViewer` op precies één bucket en GEEN delete-recht. Retentie
   gebeurt door het levensduurbeleid van de bucket zelf (35 dagen live,
   7 dagen voor niet-actuele versies). Een proces dat per ongeluk of
   kwaadwillig alles opruimt, bestaat dus niet: het recht ontbreekt.
   ============================================================ */

import { createHash, createSign } from "node:crypto";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("gcs");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const BEREIK = "https://www.googleapis.com/auth/devstorage.read_write";

export type GcsConfig = {
  readonly bucket: string;
  readonly clientEmail: string;
  readonly privateKey: string;
};

/**
 * Leest de configuratie uit de omgeving, of geeft null als er niets is.
 *
 * NULL IS EEN GELDIGE UITKOMST en geen fout: zonder credential hoort de
 * back-up lokaal te blijven werken en hoort de monitor NIET GEMETEN te
 * melden in plaats van te doen alsof er een externe kopie is.
 *
 * De sleutel komt als hele service-account-JSON in één variabele
 * (INTEL_GCS_SLEUTEL). Dat is één geheim in plaats van drie losse
 * velden die uit de pas kunnen lopen.
 */
export function gcsConfigUitOmgeving(): GcsConfig | null {
  const bucket = (process.env["INTEL_GCS_BUCKET"] ?? "").trim();
  const ruw = (process.env["INTEL_GCS_SLEUTEL"] ?? "").trim();
  if (!bucket || !ruw) return null;

  let sleutel: { client_email?: string; private_key?: string; type?: string };
  try {
    sleutel = JSON.parse(ruw) as typeof sleutel;
  } catch {
    throw new IntelFout("configuratie", "INTEL_GCS_SLEUTEL is geen geldige JSON");
  }
  if (sleutel.type !== "service_account" || !sleutel.client_email || !sleutel.private_key) {
    throw new IntelFout(
      "configuratie",
      "INTEL_GCS_SLEUTEL is geen service-account-sleutel met client_email en private_key",
    );
  }
  /* Railway-variabelen verliezen echte newlines; een sleutel met \n als
     twee tekens is een veelvoorkomende en moeilijk te vinden fout. */
  const privateKey = sleutel.private_key.includes("\\n")
    ? sleutel.private_key.replace(/\\n/g, "\n")
    : sleutel.private_key;

  return { bucket, clientEmail: sleutel.client_email, privateKey };
}

function base64url(b: Buffer | string): string {
  return Buffer.from(b).toString("base64url");
}

/**
 * Wisselt de service-account-sleutel om voor een toegangstoken.
 *
 * Dit is de standaard JWT-bearer-stroom: we tekenen zelf een JWT met
 * RS256 en ruilen die bij Google in. Geldigheid is een uur; we vragen
 * er per run één aan en bewaren hem niet op schijf.
 */
async function toegangstoken(config: GcsConfig): Promise<string> {
  const nu = Math.floor(Date.now() / 1000);
  const kop = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const lading = base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: BEREIK,
      aud: TOKEN_URL,
      iat: nu,
      exp: nu + 3600,
    }),
  );
  const tekenaar = createSign("RSA-SHA256");
  tekenaar.update(`${kop}.${lading}`);
  const sig = base64url(tekenaar.sign(config.privateKey));
  const jwt = `${kop}.${lading}.${sig}`;

  const antwoord = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!antwoord.ok) {
    /* De fouttekst van Google kan de sleutel niet bevatten, maar wel het
       e-mailadres van het account; dat is geen geheim. */
    const tekst = (await antwoord.text()).slice(0, 300);
    throw new IntelFout("netwerk", `GCS-token geweigerd (HTTP ${antwoord.status}): ${tekst}`);
  }
  const uit = (await antwoord.json()) as { access_token?: string };
  if (!uit.access_token) throw new IntelFout("netwerk", "GCS-token zonder access_token");
  return uit.access_token;
}

/**
 * Zet een object in de bucket en controleert daarna wat er staat.
 *
 * De controle is het punt. Een geslaagde PUT bewijst dat de server 200
 * zei; de sha256 die hij terugrapporteert bewijst dat de BYTES kloppen.
 * GCS geeft crc32c en md5 terug, dus vergelijken we de grootte en
 * halen we het object meteen weer op voor de sha256 — dat is dezelfde
 * som die het manifest draagt.
 */
export async function uploadNaarGcs(
  config: GcsConfig,
  objectnaam: string,
  inhoud: Buffer,
  contentType: string,
): Promise<{ generatie: string; bytes: number; sha256: string }> {
  const token = await toegangstoken(config);
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(config.bucket)}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectnaam)}`;

  const antwoord = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": contentType,
      "content-length": String(inhoud.byteLength),
    },
    body: new Uint8Array(inhoud),
  });
  if (!antwoord.ok) {
    const tekst = (await antwoord.text()).slice(0, 300);
    throw new IntelFout("netwerk", `GCS-upload mislukte (HTTP ${antwoord.status}): ${tekst}`);
  }
  const meta = (await antwoord.json()) as { generation?: string; size?: string };

  /* Terughalen en de sha256 vergelijken. Zonder deze stap is "upload
     geslaagd" een aanname over de bytes. */
  const terug = await downloadUitGcs(config, objectnaam);
  const sha256 = createHash("sha256").update(terug).digest("hex");
  const verwacht = createHash("sha256").update(inhoud).digest("hex");
  if (sha256 !== verwacht) {
    throw new IntelFout(
      "netwerk",
      `GCS-object ${objectnaam} kwam anders terug dan verzonden (sha256 wijkt af)`,
    );
  }

  log.info("naar gcs geschreven", {
    bucket: config.bucket,
    object: objectnaam,
    bytes: inhoud.byteLength,
    generatie: meta.generation ?? "onbekend",
  });
  return { generatie: meta.generation ?? "onbekend", bytes: inhoud.byteLength, sha256 };
}

/** Haalt een object op. Gooit als het er niet staat. */
export async function downloadUitGcs(config: GcsConfig, objectnaam: string): Promise<Buffer> {
  const token = await toegangstoken(config);
  const url =
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o/` +
    `${encodeURIComponent(objectnaam)}?alt=media`;
  const antwoord = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!antwoord.ok) {
    const tekst = (await antwoord.text()).slice(0, 300);
    throw new IntelFout("netwerk", `GCS-download mislukte (HTTP ${antwoord.status}): ${tekst}`);
  }
  return Buffer.from(await antwoord.arrayBuffer());
}

export type GcsObject = {
  readonly naam: string;
  readonly bytes: number;
  readonly gemaaktOp: string;
};

/** Somt de objecten in de bucket op, nieuwste laatst. */
export async function lijstGcs(config: GcsConfig, voorvoegsel = ""): Promise<GcsObject[]> {
  const token = await toegangstoken(config);
  const uit: GcsObject[] = [];
  let pagina: string | undefined;
  do {
    const url = new URL(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o`,
    );
    if (voorvoegsel) url.searchParams.set("prefix", voorvoegsel);
    url.searchParams.set("fields", "items(name,size,timeCreated),nextPageToken");
    if (pagina) url.searchParams.set("pageToken", pagina);

    const antwoord = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!antwoord.ok) {
      const tekst = (await antwoord.text()).slice(0, 300);
      throw new IntelFout("netwerk", `GCS-lijst mislukte (HTTP ${antwoord.status}): ${tekst}`);
    }
    const body = (await antwoord.json()) as {
      items?: { name: string; size: string; timeCreated: string }[];
      nextPageToken?: string;
    };
    for (const i of body.items ?? []) {
      uit.push({ naam: i.name, bytes: Number(i.size), gemaaktOp: i.timeCreated });
    }
    pagina = body.nextPageToken;
  } while (pagina);

  uit.sort((a, b) => a.gemaaktOp.localeCompare(b.gemaaktOp));
  return uit;
}
