/* ============================================================
   DASHBOARD — GitHub OIDC: wie is de uitvoerder werkelijk?
   ------------------------------------------------------------
   WAAROM DIT BESTAAT, EN WAAROM DE VORIGE OPZET NIET VOLSTOND.

   De machinepoort hing aan één statisch geheim: `INTEL_MACHINE_SLEUTEL`,
   een bearer-token in een GitHub-secret. Dat authenticeert "iemand die
   het geheim kent" en verder niets. Het zei niet WELKE repository,
   WELKE werkstroom of WELKE run er aanklopte, en het was eeuwig geldig
   tot iemand hem rouleerde. Een geheim dat uitlekt — uit een log, een
   gecompromitteerde runner, een omgevingsdump — gaf een aanvaller de
   volledige uitgiftewachtrij, met de nog niet publieke tekst van
   goedgekeurde artikelen erin.

   GitHub kan het beter bewijzen. Een werkstroom met
   `permissions: id-token: write` vraagt bij GitHub een JWT op die GitHub
   ZELF ondertekent, met daarin de repository, het werkstroompad, de
   run-id, de poging, de commit, de ref, de actor en het event. Dat token
   leeft minuten, niet maanden, en is niet door de aanroeper te
   verzinnen: de ondertekening komt van een sleutel die alleen GitHub
   heeft.

   DE WINST IS NIET ALLEEN STERKER MAAR OOK SIMPELER: er is aan de
   serverkant GEEN geheim meer nodig. Alleen configuratie — welke
   repository en welke werkstroom mogen — plus de publieke sleutels die
   GitHub zelf publiceert. Een geheim dat niet bestaat, kan niet lekken.

   ------------------------------------------------------------
   WAT HIER WORDT GECONTROLEERD, EN WAAROM ELK PUNT ERIN STAAT

     1 DE VORM. Drie delen, base64url. Een token dat niet eens de vorm
       heeft, gaat er niet verder in.
     2 HET ALGORITME. Alleen RS256. `alg: none` en elke HMAC-variant
       worden geweigerd: dat is de klassieke JWT-aanval waarbij de
       aanvaller het algoritme kiest en de server het gelooft.
     3 DE SLEUTEL. Op `kid` opgezocht in de JWKS die GitHub publiceert.
       Geen `kid`, of een `kid` die er niet in staat: weigeren. De JWKS
       wordt gecached, want anders is elk verzoek een netwerkoproep en
       daarmee een hefboom om deze server bezig te houden.
     4 DE ONDERTEKENING, over `header.payload` met de publieke sleutel.
       Dit is het enige punt dat niet te omzeilen is door iets anders
       mee te sturen.
     5 DE UITGEVER. Letterlijk gelijk aan GitHub's issuer.
     6 HET PUBLIEK (`aud`). Letterlijk gelijk aan wat deze server
       verwacht. Zonder die controle is een token dat voor een ANDERE
       dienst is uitgegeven hier ook geldig — en GitHub geeft dat token
       aan elke werkstroom die erom vraagt.
     7 DE TIJD. `exp`, `nbf` en `iat` met een kleine klokmarge, PLUS een
       eigen maximum op de leeftijd. GitHub's `exp` staat ruimer dan dit
       platform nodig heeft, en een token dat een kwartier geldig blijft
       is een kwartier lang herbruikbaar.
     8 DE HERKOMST. Repository, werkstroompad, ref en event tegen een
       allowlist uit de configuratie. Dit is de eigenlijke binding:
       alleen DEZE werkstroom in DEZE repository op DEZE branch mag
       terugmelden.

   WAT HIER NIET WORDT GECONTROLEERD, en waar het wel gebeurt: de
   EENMALIGHEID van een token (`jti`) staat in dashboard/machine.ts,
   want die vraagt de database. En de binding van een OPDRACHT aan de run
   die hem ophaalde staat in uitgifte/opdracht.ts, want dat is een
   eigenschap van het publicatielogboek en niet van het token.

   ------------------------------------------------------------
   GEEN NIEUWE AFHANKELIJKHEID

   Dit platform heeft precies twee runtime-dependencies (express en pg)
   en de CI-poort rekent daarop. Een JWT-bibliotheek erbij zou die
   belofte breken voor iets wat `node:crypto` kan: createPublicKey() leest
   een JWK rechtstreeks, en createVerify('RSA-SHA256') is precies RS256.
   ============================================================ */

import { createPublicKey, createVerify, timingSafeEqual } from "node:crypto";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("oidc");

/** De uitgever van GitHub Actions. Letterlijk, niet als patroon. */
export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

/** Waar GitHub zijn publieke sleutels publiceert. */
export const GITHUB_JWKS_URL = `${GITHUB_ISSUER}/.well-known/jwks`;

/**
 * Hoe oud mag een token zijn, ongeacht wat `exp` zegt?
 *
 * TIEN MINUTEN. GitHub geeft een ruimere geldigheid mee, en voor een
 * werkstroom die zijn token per aanroep opvraagt is dat niet nodig: er
 * zitten seconden tussen het opvragen en het gebruiken. Een kortere
 * eigen grens verkleint het venster waarin een onderschept token nog
 * iets kan.
 */
export const MAX_LEEFTIJD_SECONDEN = 600;

/** Hoeveel klokverschil tussen GitHub en deze server is aanvaardbaar. */
export const KLOKMARGE_SECONDEN = 60;

/** Hoe lang de JWKS in het geheugen blijft staan. */
export const JWKS_CACHE_SECONDEN = 600;

/** De claims die dit platform uit een GitHub-token leest. */
export type RunIdentiteit = {
  readonly repository: string;
  readonly repositoryId: string | null;
  readonly workflowRef: string;
  readonly jobWorkflowRef: string | null;
  readonly runId: string;
  readonly runAttempt: string | null;
  readonly sha: string | null;
  readonly ref: string | null;
  readonly eventName: string | null;
  readonly actor: string | null;
  readonly jti: string;
  readonly verlooptOp: Date;
};

/** Wat er van de uitvoerder wordt verwacht; alles verplicht. */
export type OidcAllowlist = {
  readonly audience: string;
  readonly repository: string;
  /** Het pad, bijvoorbeeld '.github/workflows/uitgifte.yml'. */
  readonly workflow: string;
  /** De ref waarop de werkstroom mag draaien. */
  readonly ref: string;
  /** Welke events mogen; standaard de twee die de werkstroom kent. */
  readonly events: readonly string[];
};

/**
 * De allowlist uit de omgeving, of null.
 *
 * NULL IS EEN TOESTAND EN GEEN FOUT: zonder deze configuratie weigert de
 * machinepoort elk verzoek met 503. Dat is dezelfde fail-closed regel
 * als de vorige opzet had, nu zonder geheim.
 */
export function allowlistUitOmgeving(): OidcAllowlist | null {
  const audience = (process.env["INTEL_OIDC_AUDIENCE"] ?? "").trim();
  const repository = (process.env["INTEL_UITGIFTE_REPOSITORY"] ?? "").trim();
  const workflow = (process.env["INTEL_UITGIFTE_WORKFLOW"] ?? "").trim();
  if (audience === "" || repository === "" || workflow === "") return null;
  return {
    audience,
    repository,
    workflow,
    ref: (process.env["INTEL_UITGIFTE_REF"] ?? "refs/heads/main").trim(),
    /* schedule en workflow_dispatch zijn de twee triggers die
       uitgifte.yml kent. Een token uit een pull_request-run van een fork
       hoort hier niet langs te komen, en die staat dus niet in de
       lijst. */
    events: ["schedule", "workflow_dispatch"],
  };
}

export type Haler = (url: string) => Promise<{ status: number; tekst: string }>;

function standaardHaler(timeoutMs = 10_000): Haler {
  return async (url) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { status: r.status, tekst: await r.text() };
  };
}

type Jwk = { kid?: string; kty?: string; alg?: string; n?: string; e?: string; use?: string };

let jwksCache: { op: number; sleutels: readonly Jwk[] } | null = null;

/** Alleen voor toetsen: laat de cache vallen. */
export function jwksCacheVergeten(): void {
  jwksCache = null;
}

async function haalJwks(haal: Haler, nuMs: number): Promise<readonly Jwk[]> {
  if (jwksCache !== null && nuMs - jwksCache.op < JWKS_CACHE_SECONDEN * 1000) {
    return jwksCache.sleutels;
  }
  const url = (process.env["INTEL_OIDC_JWKS_URL"] ?? GITHUB_JWKS_URL).trim();
  const r = await haal(url);
  if (r.status !== 200) {
    throw new IntelFout("netwerk", `de JWKS van ${url} gaf HTTP ${r.status}`);
  }
  let sleutels: readonly Jwk[];
  try {
    const j = JSON.parse(r.tekst) as { keys?: Jwk[] };
    sleutels = Array.isArray(j.keys) ? j.keys : [];
  } catch {
    throw new IntelFout("netwerk", "de JWKS is geen geldige JSON");
  }
  if (sleutels.length === 0) throw new IntelFout("netwerk", "de JWKS bevat geen sleutels");
  jwksCache = { op: nuMs, sleutels };
  return sleutels;
}

function b64urlNaarBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function gelijk(a: string, b: string): boolean {
  /* Constante tijd, ook hier. Een vergelijking op `aud` of `repository`
     lekt via de responstijd hoeveel tekens kloppen, en die waarden zijn
     weliswaar geen geheim maar het kost niets om het netjes te doen. */
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Verifieert een GitHub-OIDC-token en geeft de runidentiteit terug.
 *
 * WERPT BIJ ELKE TWIJFEL. Er is geen pad waarop deze functie een
 * identiteit teruggeeft die niet alle acht controles heeft gehaald.
 */
export async function verifieerGithubToken(
  token: string,
  allowlist: OidcAllowlist,
  opties: { readonly haal?: Haler; readonly nuMs?: number } = {},
): Promise<RunIdentiteit> {
  const haal = opties.haal ?? standaardHaler();
  const nuMs = opties.nuMs ?? Date.now();
  const nu = Math.floor(nuMs / 1000);

  /* ---------- 1. de vorm ---------- */
  const delen = token.split(".");
  if (delen.length !== 3 || delen.some((d) => d.length === 0)) {
    throw new IntelFout("autorisatie", "het token heeft niet de vorm van een JWT");
  }
  const [kopB64, lastB64, sigB64] = delen as [string, string, string];

  let kop: { alg?: string; kid?: string; typ?: string };
  let last: Record<string, unknown>;
  try {
    kop = JSON.parse(b64urlNaarBuffer(kopB64).toString("utf8")) as typeof kop;
    last = JSON.parse(b64urlNaarBuffer(lastB64).toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new IntelFout("autorisatie", "de kop of de lading van het token is geen JSON");
  }

  /* ---------- 2. het algoritme ---------- */
  if (kop.alg !== "RS256") {
    throw new IntelFout(
      "autorisatie",
      `alg '${String(kop.alg)}' wordt niet aanvaard; alleen RS256. 'none' en elke HMAC-variant ` +
        `zijn de klassieke aanval waarbij de aanroeper het algoritme kiest`,
    );
  }
  if (typeof kop.kid !== "string" || kop.kid.length === 0) {
    throw new IntelFout("autorisatie", "het token noemt geen kid, dus er is geen sleutel te kiezen");
  }

  /* ---------- 3. de sleutel ---------- */
  const sleutels = await haalJwks(haal, nuMs);
  const jwk = sleutels.find((k) => k.kid === kop.kid);
  if (jwk === undefined) {
    /* Een onbekende kid kan ook een SLEUTELROTATIE zijn. Dan is de cache
       oud en hoort hij één keer te worden weggegooid in plaats van het
       token te weigeren op iets wat de server zelf verouderd heeft. */
    jwksCacheVergeten();
    const versers = await haalJwks(haal, nuMs);
    const tweedeKans = versers.find((k) => k.kid === kop.kid);
    if (tweedeKans === undefined) {
      throw new IntelFout("autorisatie", `kid '${kop.kid}' staat niet in de JWKS van de uitgever`);
    }
    return await verifieerMetSleutel(tweedeKans, token, kop, last, allowlist, nu, kopB64, lastB64, sigB64);
  }
  return await verifieerMetSleutel(jwk, token, kop, last, allowlist, nu, kopB64, lastB64, sigB64);
}

async function verifieerMetSleutel(
  jwk: Jwk,
  _token: string,
  _kop: { alg?: string; kid?: string },
  last: Record<string, unknown>,
  allowlist: OidcAllowlist,
  nu: number,
  kopB64: string,
  lastB64: string,
  sigB64: string,
): Promise<RunIdentiteit> {
  /* ---------- 4. de ondertekening ---------- */
  if (jwk.kty !== "RSA" || typeof jwk.n !== "string" || typeof jwk.e !== "string") {
    throw new IntelFout("autorisatie", "de sleutel uit de JWKS is geen bruikbare RSA-sleutel");
  }
  let publiek;
  try {
    publiek = createPublicKey({
      key: { kty: "RSA", n: jwk.n, e: jwk.e } as never,
      format: "jwk",
    });
  } catch (e) {
    throw new IntelFout("autorisatie", `de sleutel uit de JWKS is niet te lezen: ${(e as Error).message}`);
  }
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${kopB64}.${lastB64}`);
  verifier.end();
  if (!verifier.verify(publiek, b64urlNaarBuffer(sigB64))) {
    throw new IntelFout("autorisatie", "de ondertekening van het token klopt niet");
  }

  const tekst = (naam: string): string | null => {
    const w = last[naam];
    return typeof w === "string" && w.length > 0 ? w : null;
  };
  const getal = (naam: string): number | null => {
    const w = last[naam];
    return typeof w === "number" && Number.isFinite(w) ? w : null;
  };

  /* ---------- 5. de uitgever ---------- */
  const iss = tekst("iss");
  const verwachteIss = (process.env["INTEL_OIDC_ISSUER"] ?? GITHUB_ISSUER).trim();
  if (iss === null || !gelijk(iss, verwachteIss)) {
    throw new IntelFout("autorisatie", `uitgever '${String(iss)}' is niet ${verwachteIss}`);
  }

  /* ---------- 6. het publiek ---------- */
  /* `aud` mag volgens de JWT-specificatie ook een lijst zijn. GitHub
     geeft één string, maar een verificatie die alleen de stringvorm kent
     zou op een lijst stilletjes NIETS controleren. */
  const audRuw = last["aud"];
  const auds = typeof audRuw === "string" ? [audRuw] : Array.isArray(audRuw) ? audRuw : [];
  if (!auds.some((a) => typeof a === "string" && gelijk(a, allowlist.audience))) {
    throw new IntelFout(
      "autorisatie",
      `het token is niet voor dit publiek uitgegeven (aud ${JSON.stringify(audRuw)}, verwacht ` +
        `'${allowlist.audience}')`,
    );
  }

  /* ---------- 7. de tijd ---------- */
  const exp = getal("exp");
  const iat = getal("iat");
  const nbf = getal("nbf");
  if (exp === null || iat === null) {
    throw new IntelFout("autorisatie", "het token noemt geen exp of geen iat");
  }
  if (nu > exp + KLOKMARGE_SECONDEN) {
    throw new IntelFout("autorisatie", `het token is verlopen (exp ${exp}, nu ${nu})`);
  }
  if (nbf !== null && nu + KLOKMARGE_SECONDEN < nbf) {
    throw new IntelFout("autorisatie", `het token is nog niet geldig (nbf ${nbf}, nu ${nu})`);
  }
  if (nu > iat + MAX_LEEFTIJD_SECONDEN) {
    throw new IntelFout(
      "autorisatie",
      `het token is ${nu - iat} seconden oud en de eigen grens is ${MAX_LEEFTIJD_SECONDEN}; ` +
        `een werkstroom vraagt zijn token per aanroep op`,
    );
  }
  if (iat > nu + KLOKMARGE_SECONDEN) {
    throw new IntelFout("autorisatie", `het token komt uit de toekomst (iat ${iat}, nu ${nu})`);
  }

  /* ---------- 8. de herkomst ---------- */
  const repository = tekst("repository");
  if (repository === null || !gelijk(repository, allowlist.repository)) {
    throw new IntelFout(
      "autorisatie",
      `repository '${String(repository)}' staat niet op de allowlist ('${allowlist.repository}')`,
    );
  }
  const workflowRef = tekst("workflow_ref");
  if (workflowRef === null) {
    throw new IntelFout("autorisatie", "het token noemt geen workflow_ref");
  }
  /* workflow_ref ziet zo uit:
       OWNER/REPO/.github/workflows/uitgifte.yml@refs/heads/main
     Zowel het PAD als de REF worden getoetst; alleen op het pad toetsen
     zou een kopie van de werkstroom op een eigen branch toelaten. */
  const verwachtePrefix = `${allowlist.repository}/${allowlist.workflow}@`;
  if (!workflowRef.startsWith(verwachtePrefix)) {
    throw new IntelFout(
      "autorisatie",
      `workflow_ref '${workflowRef}' hoort te beginnen met '${verwachtePrefix}'`,
    );
  }
  const refUitWorkflow = workflowRef.slice(verwachtePrefix.length);
  if (!gelijk(refUitWorkflow, allowlist.ref)) {
    throw new IntelFout(
      "autorisatie",
      `de werkstroom draait op '${refUitWorkflow}' en toegestaan is '${allowlist.ref}'`,
    );
  }
  const eventName = tekst("event_name");
  if (eventName === null || !allowlist.events.includes(eventName)) {
    throw new IntelFout(
      "autorisatie",
      `event '${String(eventName)}' is niet toegestaan (${allowlist.events.join(", ")})`,
    );
  }
  const runId = tekst("run_id");
  const jti = tekst("jti");
  if (runId === null || jti === null) {
    throw new IntelFout(
      "autorisatie",
      "het token noemt geen run_id of geen jti; zonder die twee is er geen runidentiteit en geen " +
        "eenmaligheid",
    );
  }

  log.info("oidc geverifieerd", {
    repository,
    workflowRef,
    runId,
    poging: tekst("run_attempt"),
    event: eventName,
  });

  return {
    repository,
    repositoryId: tekst("repository_id"),
    workflowRef,
    jobWorkflowRef: tekst("job_workflow_ref"),
    runId,
    runAttempt: tekst("run_attempt"),
    sha: tekst("sha"),
    ref: tekst("ref"),
    eventName,
    actor: tekst("actor"),
    jti,
    verlooptOp: new Date((exp + KLOKMARGE_SECONDEN) * 1000),
  };
}
