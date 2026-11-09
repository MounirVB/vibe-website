/* ============================================================
   INTEGRATIE — de machinepoort, en wat hij NIET aanneemt
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET.

   De machinepoort is een PUBLIEK endpoint op een internetgerichte
   dienst, en het enige pad waarlangs iets zonder mens naar productie
   kan. V1 hing aan één statisch geheim; V1.1 hangt aan een
   GitHub-OIDC-token dat GitHub zelf ondertekent. Elke zaak hieronder
   sluit één weg af waarlangs die bescherming zou kunnen wijken.

   DE SLEUTELS ZIJN ECHT. Deze suite maakt een eigen RSA-sleutelpaar,
   serveert zijn eigen JWKS op 127.0.0.1 en ondertekent zijn eigen
   tokens met node:crypto. De verificatie in dashboard/oidc.ts wordt dus
   werkelijk uitgeoefend — signatuur, kid, issuer, audience, tijd en
   herkomst — in plaats van weggemockt. Er gaat geen enkel verzoek naar
   GitHub en er is geen netwerk nodig buiten loopback.

   DE DRIE AANVALLEN DIE EEN JWT-VERIFICATIE PLEEGT TE MISSEN, en die
   hier daarom allemaal een eigen zaak hebben:

     alg: none       de aanvaller kiest geen algoritme
     HS256           de publieke sleutel is geen HMAC-geheim
     aud als lijst   een verificatie die alleen een string kent, toetst
                     bij een lijst stilletjes niets

   ER WORDT NIETS GEPUBLICEERD. Alles staat in een wegwerpdatabase; de
   publieke site wordt nooit aangeraakt.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { createServer, type Server } from "node:http";
import { createSign, createHmac, generateKeyPairSync, type KeyObject } from "node:crypto";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import { configVergeten } from "../../src/kern/config.ts";
import { maakApp } from "../../src/dashboard/server.ts";
import { maakSessieCookie } from "../../src/dashboard/auth.ts";
import { automatischPubliceren } from "../../src/inhoud/autopublicatie.ts";
import { inhoudAfdruk } from "../../src/inhoud/concept.ts";
import { jwksCacheVergeten, MAX_LEEFTIJD_SECONDEN } from "../../src/dashboard/oidc.ts";
import { SYSTEEMGRONDEN } from "../../src/inhoud/actor.ts";
import { maakUitgifteWachtrij } from "../../src/uitgifte/opdracht.ts";

/* ---------------- JWT-gereedschap, met echte sleutels ---------------- */

const KID = "toets-sleutel-1";
const ISSUER = "https://oidc.toets.local";
const AUDIENCE = "vibe-intel-uitgifte-toets";
const REPOSITORY = "MounirVB/vibe-website";
const WORKFLOW = ".github/workflows/uitgifte.yml";
const REF = "refs/heads/main";

const paar = generateKeyPairSync("rsa", { modulusLength: 2048 });
/** Een TWEEDE paar, om een geldige ondertekening met de verkeerde sleutel te maken. */
const vreemdPaar = generateKeyPairSync("rsa", { modulusLength: 2048 });

const b64url = (b: Buffer | string): string =>
  (typeof b === "string" ? Buffer.from(b, "utf8") : b)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

type Claims = Record<string, unknown>;

function nuSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** De claims die GitHub in een echt werkstroomtoken zet. */
function echteClaims(extra: Claims = {}): Claims {
  const nu = nuSec();
  return {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: `repo:${REPOSITORY}:ref:${REF}`,
    repository: REPOSITORY,
    repository_id: "123456",
    repository_owner: "MounirVB",
    workflow: "Autonome uitgifte",
    workflow_ref: `${REPOSITORY}/${WORKFLOW}@${REF}`,
    job_workflow_ref: `${REPOSITORY}/${WORKFLOW}@${REF}`,
    run_id: "9001",
    run_number: "7",
    run_attempt: "1",
    sha: "a".repeat(40),
    ref: REF,
    ref_type: "branch",
    event_name: "schedule",
    actor: "MounirVB",
    jti: `jti-${Math.random().toString(36).slice(2)}-${nu}`,
    iat: nu,
    nbf: nu - 5,
    exp: nu + 300,
    ...extra,
  };
}

function tekenMet(sleutel: KeyObject, claims: Claims, kop: Claims = {}): string {
  const k = b64url(JSON.stringify({ alg: "RS256", kid: KID, typ: "JWT", ...kop }));
  const l = b64url(JSON.stringify(claims));
  const sig = createSign("RSA-SHA256").update(`${k}.${l}`).end().sign(sleutel);
  return `${k}.${l}.${b64url(sig)}`;
}

/** Een geldig token, tenzij je er iets kapots in zet. */
function token(extra: Claims = {}, kop: Claims = {}): string {
  return tekenMet(paar.privateKey, echteClaims(extra), kop);
}

describe("de machinepoort", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let andereOrg = 0;
  let beheerder = 0;
  let auteur = 0;
  let server: Server;
  let jwksServer: Server;
  let basis = "";
  let teller = 0;
  let site = "";
  let intelWortel = "";

  before(async () => {
    db = await maakWegwerpdatabase("machinepoort");
    /* DE SERVER KIEST DE ORGANISATIE, EN HIJ DOET DAT VIA
       INTEL_ORGANISATIE. huidigeOrganisatie() zoekt die sleutel op in
       intel.organisaties; staat hij er niet, dan antwoordt de poort 500
       met "organisatie bestaat niet". De eerste versie van deze suite
       maakte organisaties met een eigen naam en viel daar op — en dat is
       precies de reden dat de organisatie NIET uit het verzoek komt. */
    process.env["INTEL_ORGANISATIE"] = "vibe-energy";
    /* HET SESSIEGEHEIM MOET VASTSTAAN. maakSessieCookie() ondertekent
       met INTEL_SESSIE_GEHEIM; zonder vaste waarde maakt deze suite een
       koekje dat de server niet herkent, en dan bewijst zaak 11 niets
       (hij zou op een ONGELDIG koekje slagen in plaats van op de
       scheiding tussen de twee wegen). Dezelfde opzet als
       studio-http.test.ts. */
    process.env["INTEL_SESSIE_GEHEIM"] = "m".repeat(40);
    configVergeten();
    org = await maakOrganisatie(db, "vibe-energy");
    andereOrg = await maakOrganisatie(db, "machine-andere-org");
    beheerder = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");

    /* De eigen JWKS. oidc.ts leest INTEL_OIDC_JWKS_URL, dus hier hoeft
       niets gemockt te worden: de echte haler haalt de echte sleutel
       van loopback op. */
    const jwk = paar.publicKey.export({ format: "jwk" }) as Record<string, unknown>;
    jwksServer = createServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] }));
    });
    await new Promise<void>((r) => jwksServer.listen(0, "127.0.0.1", () => r()));
    const jwksPoort = (jwksServer.address() as { port: number }).port;

    process.env["INTEL_OIDC_JWKS_URL"] = `http://127.0.0.1:${jwksPoort}/jwks`;
    process.env["INTEL_OIDC_ISSUER"] = ISSUER;

    /* EEN SITEWORTEL MET HET ECHTE ARTEFACT.
       De wachtrij bouwt het registerrecord met data/sitekennis.json als
       routebron, en leesSitekennis() toetst dat bestand streng: schema,
       websiteversie als sha256, inhoudshash als sha256, en per pagina
       een geldige vingerafdruk. Een met de hand geschreven artefact
       strandde daar drie keer achter elkaar op — en dat is terecht, want
       een half artefact is geen routebron.

       Daarom het ECHTE bestand uit deze checkout: 431 gepubliceerde
       pagina's, met alle dertien clusters uit CLUSTER_NAAR_ROUTE erin.
       Dat is ook wat de productiecontainer heeft. */
    site = await mkdtemp(join(tmpdir(), "intel-machine-"));
    intelWortel = join(site, "intelligence");
    await mkdir(join(intelWortel, "data"), { recursive: true });
    await copyFile(
      join(dirname(new URL(import.meta.url).pathname), "..", "..", "data", "sitekennis.json"),
      join(intelWortel, "data", "sitekennis.json"),
    );

    const app = maakApp(db.pool);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", () => r()));
    basis = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await new Promise<void>((r) => jwksServer.close(() => r()));
    delete process.env["INTEL_OIDC_JWKS_URL"];
    delete process.env["INTEL_OIDC_ISSUER"];
    delete process.env["INTEL_OIDC_AUDIENCE"];
    delete process.env["INTEL_UITGIFTE_REPOSITORY"];
    delete process.env["INTEL_UITGIFTE_WORKFLOW"];
    delete process.env["INTEL_UITGIFTE_REF"];
    jwksCacheVergeten();
    await db.opruimen();
    configVergeten();
  });

  /** Een korte samenvatting van de wachtrij; de volledige dump is
      tienduizenden tekens aan registerrecords en maakt een rode toets
      onleesbaar. */
  function kortRapport(rij: { stop: readonly { sleutel: string }[]; opdrachten: readonly { inhoudVersieId: number; fase: string | null }[]; geweigerd: readonly { inhoudVersieId: number; reden: string }[]; vandaagGepubliceerd: number }, versieId: number): string {
    return (
      `geen opdracht voor versie ${versieId}. ` +
      `stop=[${rij.stop.map((x) => x.sleutel).join(",")}] ` +
      `opdrachten=[${rij.opdrachten.map((o) => `${o.inhoudVersieId}:${o.fase ?? "-"}`).join(",")}] ` +
      `geweigerd=[${rij.geweigerd.map((g) => `${g.inhoudVersieId}:${g.reden.slice(0, 60)}`).join(" | ")}] ` +
      `vandaag=${rij.vandaagGepubliceerd}`
    );
  }

  beforeEach(async () => {
    /* HET DAGPLAFOND TELT PER ORGANISATIE, EN DEZE SUITE KAN NIET
       UITWIJKEN. De machinepoort kiest de organisatie zelf uit
       INTEL_ORGANISATIE — dat is juist de bescherming die zaak 6b
       bewijst — dus elke zaak werkt in dezelfde organisatie. Vier zaken
       die elk een registerrecord melden zouden samen over het plafond
       van drie per dag gaan, en dan meet de laatste zaak de
       stroomonderbreker in plaats van zijn eigen onderwerp. Het plafond
       wordt in uitgifte-keten.test.ts apart bewezen; hier wordt de
       teller tussen de zaken op nul gezet. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("delete from intel.publicaties where organisatie_id = $1", [org]);
    });

    /* De allowlist staat standaard AAN in deze suite; de zaak die hem
       weghaalt zet hem zelf terug. */
    process.env["INTEL_OIDC_AUDIENCE"] = AUDIENCE;
    process.env["INTEL_UITGIFTE_REPOSITORY"] = REPOSITORY;
    process.env["INTEL_UITGIFTE_WORKFLOW"] = WORKFLOW;
    process.env["INTEL_UITGIFTE_REF"] = REF;
  });

  /* ---------------- hulpmiddelen ---------------- */

  type Antwoord = { status: number; lichaam: Record<string, unknown>; tekst: string };

  async function vraag(
    pad: string,
    opties: {
      methode?: string;
      bearer?: string | null;
      lichaam?: unknown;
      kop?: Record<string, string>;
    } = {},
  ): Promise<Antwoord> {
    const koppen: Record<string, string> = { ...(opties.kop ?? {}) };
    if (opties.bearer !== null && opties.bearer !== undefined) {
      koppen["authorization"] = `Bearer ${opties.bearer}`;
    }
    if (opties.lichaam !== undefined) koppen["content-type"] = "application/json";
    const r = await fetch(`${basis}${pad}`, {
      method: opties.methode ?? "GET",
      headers: koppen,
      ...(opties.lichaam === undefined ? {} : { body: JSON.stringify(opties.lichaam) }),
      redirect: "manual",
    });
    const tekst = await r.text();
    let lichaam: Record<string, unknown> = {};
    try {
      lichaam = JSON.parse(tekst) as Record<string, unknown>;
    } catch {
      /* een HTML-antwoord is ook een uitkomst */
    }
    return { status: r.status, lichaam, tekst };
  }

  const DRIE_ROUTES: readonly { naam: string; pad: string; methode: string; lichaam?: unknown }[] = [
    { naam: "GET /machine/stand", pad: "/machine/stand", methode: "GET" },
    { naam: "GET /machine/uitgifte", pad: "/machine/uitgifte", methode: "GET" },
    {
      naam: "POST /machine/uitgifte/1",
      pad: "/machine/uitgifte/1",
      methode: "POST",
      lichaam: { fase: "RECORD_GESCHREVEN", bewijs: { beleidVersie: "x", recordHash: "y", waar: "z" } },
    },
  ];

  async function zetBeleid(doelOrg = org): Promise<string> {
    const versie = `machine-${(teller += 1)}`;
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doelOrg)]);
      await c.query("update intel.publicatiebeleid set actief = false where organisatie_id = $1", [doelOrg]);
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1, $2, true, true, 'laag', array['nieuw_artikel'], 1, 3, true)`,
        [doelOrg, versie],
      );
    });
    return versie;
  }

  /** Een versie die door beleid is goedgekeurd en in de wachtrij staat. */
  async function maakGoedgekeurdeVersie(
    doelOrg = org,
    doelAuteur = auteur,
  ): Promise<{ versieId: number; slug: string }> {
    const slug = `machine-zaak-${(teller += 1)}`;
    const v = await maakDragendeVersie(db, doelOrg, {
      slug,
      publiceerbaar: true,
      aangemaaktDoor: doelAuteur,
      bronSleutel: "acm-besluiten",
    });
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doelOrg)]);
      await c.query(
        `update intel.markt_gebeurtenissen g
            set gebeurd_op = now() - interval '1 day'
          where g.organisatie_id = $1
            and g.id = (select k.gebeurtenis_id
                          from intel.inhoud_versies v
                          join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
                         where v.id = $2)`,
        [doelOrg, v.versieId],
      );
      /* Eigen tekst per versie: de afdruk komt uit de tekst, dus zonder
         onderscheid is elke tweede versie een duplicaat. */
      const r = await c.query<{
        titel: string;
        direct_antwoord: string | null;
        body_markdown: string;
        structured_data: unknown;
      }>(
        `select titel, direct_antwoord, body_markdown, structured_data
           from intel.inhoud_versies where id = $1`,
        [v.versieId],
      );
      const rij = r.rows[0]!;
      /* HET KENMERK IS EEN LETTERREEKS EN GEEN GETAL. Poort 7
         (`geen_verzonnen_getallen`) eist dat elk cijfer in de body
         terugkomt in een gebonden uitspraak; een teller in cijfers laat
         die poort vallen op een getal dat niets beweert. Gemeten: met
         'machinezaak14' in de tekst weigerde de hertoets de hele
         goedkeuring. */
      const letters = "abcdefghijklmnopqrstuvwxyz";
      let rest = teller;
      let kenmerk = "";
      do {
        kenmerk = `${letters.charAt(rest % 26)}${kenmerk}`;
        rest = Math.floor(rest / 26);
      } while (rest > 0);
      const body = `${rij.body_markdown}\nKenmerk: zaak ${kenmerk}.\n`;
      const afdruk = inhoudAfdruk({
        titel: rij.titel,
        directAntwoord: rij.direct_antwoord ?? "",
        bodyMarkdown: body,
        structuredData: rij.structured_data,
      });
      await c.query(
        "update intel.inhoud_versies set body_markdown = $2, inhoud_afdruk = $3 where id = $1",
        [v.versieId, body, afdruk],
      );
    });
    await automatischPubliceren(db.pool, doelOrg, {});
    return { versieId: v.versieId, slug };
  }

  async function besluitenVan(versieId: number, doelOrg = org) {
    return metOrganisatie(db.pool, { organisatieId: doelOrg }, async (c) => {
      const r = await c.query<{
        besluit: string;
        actor_soort: string;
        door_gebruiker_id: number | null;
        beleid_versie: string | null;
        poortresultaten: Record<string, unknown>;
      }>(
        `select besluit, actor_soort, door_gebruiker_id, beleid_versie, poortresultaten
           from intel.publicatiebesluiten
          where organisatie_id = $1 and inhoud_versie_id = $2
          order by id`,
        [doelOrg, versieId],
      );
      return r.rows;
    });
  }

  /* ================================================================
     1 — zonder allowlist is er geen poort
     ================================================================ */

  test("1 · zonder allowlist antwoordt ELKE route 503 en noemt de variabelen", async () => {
    delete process.env["INTEL_OIDC_AUDIENCE"];
    delete process.env["INTEL_UITGIFTE_REPOSITORY"];
    delete process.env["INTEL_UITGIFTE_WORKFLOW"];
    for (const r of DRIE_ROUTES) {
      const a = await vraag(r.pad, { methode: r.methode, bearer: token(), lichaam: r.lichaam });
      assert.equal(a.status, 503, `${r.naam} gaf ${a.status}`);
      assert.match(String(a.lichaam["fout"] ?? ""), /INTEL_OIDC_AUDIENCE/);
      assert.match(String(a.lichaam["fout"] ?? ""), /INTEL_UITGIFTE_REPOSITORY/);
    }
  });

  test("1b · een HALVE allowlist is geen allowlist", async () => {
    delete process.env["INTEL_UITGIFTE_WORKFLOW"];
    const a = await vraag("/machine/stand", { bearer: token() });
    assert.equal(a.status, 503, a.tekst.slice(0, 200));
  });

  /* ================================================================
     2 — geen token, en de drie klassieke JWT-aanvallen
     ================================================================ */

  test("2 · zonder Bearer-token is het 401, en het antwoord zegt wat er wordt verwacht", async () => {
    for (const r of DRIE_ROUTES) {
      const a = await vraag(r.pad, { methode: r.methode, bearer: null, lichaam: r.lichaam });
      assert.equal(a.status, 401, `${r.naam} gaf ${a.status}`);
      assert.match(String(a.lichaam["fout"] ?? ""), /OIDC/);
    }
  });

  test("2b · 'alg: none' wordt geweigerd", async () => {
    /* De klassieke aanval: de aanvaller kiest het algoritme en de server
       gelooft hem. Een token zonder ondertekening hoort nooit langs te
       komen, ook niet als alle claims kloppen. */
    const k = b64url(JSON.stringify({ alg: "none", kid: KID, typ: "JWT" }));
    const l = b64url(JSON.stringify(echteClaims()));
    const a = await vraag("/machine/stand", { bearer: `${k}.${l}.` });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /JWT|RS256|none/i);
  });

  test("2c · HS256 met de PUBLIEKE sleutel als geheim wordt geweigerd", async () => {
    /* De tweede klassieke aanval: de publieke sleutel is openbaar, dus
       wie HMAC mag kiezen kan zelf een geldige ondertekening maken. */
    const publiekPem = paar.publicKey.export({ type: "spki", format: "pem" }).toString();
    const k = b64url(JSON.stringify({ alg: "HS256", kid: KID, typ: "JWT" }));
    const l = b64url(JSON.stringify(echteClaims()));
    const sig = createHmac("sha256", publiekPem).update(`${k}.${l}`).digest();
    const a = await vraag("/machine/stand", { bearer: `${k}.${l}.${b64url(sig)}` });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /RS256/);
  });

  test("2d · een geldige ondertekening met de VERKEERDE sleutel wordt geweigerd", async () => {
    const t = tekenMet(vreemdPaar.privateKey, echteClaims());
    const a = await vraag("/machine/stand", { bearer: t });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /ondertekening/);
  });

  test("2e · een onbekende kid wordt geweigerd", async () => {
    const t = token({}, { kid: "bestaat-niet" });
    const a = await vraag("/machine/stand", { bearer: t });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /kid/);
  });

  test("2f · een token dat geen JWT is wordt geweigerd", async () => {
    for (const rommel of ["", "abc", "a.b", "a.b.c.d", "....", "null.null.null"]) {
      const a = await vraag("/machine/stand", { bearer: rommel });
      assert.equal(a.status, 401, `'${rommel}' gaf ${a.status}`);
    }
  });

  /* ================================================================
     3 — uitgever, publiek en tijd
     ================================================================ */

  test("3 · een andere uitgever wordt geweigerd", async () => {
    const a = await vraag("/machine/stand", { bearer: token({ iss: "https://kwaadaardig.example" }) });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /uitgever/);
  });

  test("3b · een token voor een ANDER publiek wordt geweigerd", async () => {
    const a = await vraag("/machine/stand", { bearer: token({ aud: "een-andere-dienst" }) });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /publiek/);
  });

  test("3c · aud als LIJST wordt echt getoetst", async () => {
    /* De derde klassieke aanval. `aud` mag volgens de specificatie een
       lijst zijn; een verificatie die alleen de stringvorm kent, toetst
       bij een lijst stilletjes niets. */
    const metOns = await vraag("/machine/stand", {
      bearer: token({ aud: ["iets-anders", AUDIENCE] }),
    });
    assert.equal(metOns.status, 200, metOns.tekst.slice(0, 200));
    const zonderOns = await vraag("/machine/stand", {
      bearer: token({ aud: ["iets-anders", "nog-iets"] }),
    });
    assert.equal(zonderOns.status, 401);
    assert.match(String(zonderOns.lichaam["fout"] ?? ""), /publiek/);
  });

  test("3d · verlopen, nog-niet-geldig, te oud en uit-de-toekomst worden alle vier geweigerd", async () => {
    const nu = nuSec();
    const gevallen: readonly [string, Claims, RegExp][] = [
      ["verlopen", { exp: nu - 3600, iat: nu - 3700, nbf: nu - 3700 }, /verlopen/],
      ["nog niet geldig", { nbf: nu + 3600, exp: nu + 7200 }, /nog niet geldig/],
      [
        "te oud",
        { iat: nu - (MAX_LEEFTIJD_SECONDEN + 120), nbf: nu - (MAX_LEEFTIJD_SECONDEN + 120), exp: nu + 3600 },
        /seconden oud/,
      ],
      ["uit de toekomst", { iat: nu + 3600, nbf: nu - 10, exp: nu + 7200 }, /toekomst/],
    ];
    for (const [naam, extra, patroon] of gevallen) {
      const a = await vraag("/machine/stand", { bearer: token(extra) });
      assert.equal(a.status, 401, `${naam} gaf ${a.status}: ${a.tekst.slice(0, 160)}`);
      assert.match(String(a.lichaam["fout"] ?? ""), patroon, naam);
    }
  });

  /* ================================================================
     4 — de herkomst: repository, werkstroom, ref en event
     ================================================================ */

  test("4 · een andere repository wordt geweigerd", async () => {
    const a = await vraag("/machine/stand", {
      bearer: token({
        repository: "iemandanders/vibe-website",
        workflow_ref: `iemandanders/vibe-website/${WORKFLOW}@${REF}`,
      }),
    });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /repository/);
  });

  test("4b · een ANDERE werkstroom in dezelfde repository wordt geweigerd", async () => {
    const a = await vraag("/machine/stand", {
      bearer: token({ workflow_ref: `${REPOSITORY}/.github/workflows/poort.yml@${REF}` }),
    });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /workflow_ref/);
  });

  test("4c · de JUISTE werkstroom op een ANDERE branch wordt geweigerd", async () => {
    /* Zonder deze controle zou een kopie van de werkstroom op een eigen
       branch mogen terugmelden, en dan is de branchbescherming op main
       niets meer waard. */
    const a = await vraag("/machine/stand", {
      bearer: token({ workflow_ref: `${REPOSITORY}/${WORKFLOW}@refs/heads/kwaadaardig` }),
    });
    assert.equal(a.status, 401);
    assert.match(String(a.lichaam["fout"] ?? ""), /draait op/);
  });

  test("4d · een event dat niet op de lijst staat wordt geweigerd", async () => {
    for (const ev of ["pull_request", "push", "issue_comment", "fork"]) {
      const a = await vraag("/machine/stand", { bearer: token({ event_name: ev }) });
      assert.equal(a.status, 401, `${ev} gaf ${a.status}`);
      assert.match(String(a.lichaam["fout"] ?? ""), /event/);
    }
    for (const ev of ["schedule", "workflow_dispatch"]) {
      const a = await vraag("/machine/stand", { bearer: token({ event_name: ev }) });
      assert.equal(a.status, 200, `${ev} gaf ${a.status}`);
    }
  });

  test("4e · een token zonder run_id of zonder jti wordt geweigerd", async () => {
    for (const weg of ["run_id", "jti"]) {
      const claims = echteClaims();
      delete claims[weg];
      const a = await vraag("/machine/stand", { bearer: tekenMet(paar.privateKey, claims) });
      assert.equal(a.status, 401, `zonder ${weg} gaf ${a.status}`);
      assert.match(String(a.lichaam["fout"] ?? ""), /run_id|jti/);
    }
  });

  /* ================================================================
     5 — replaybescherming
     ================================================================ */

  test("5 · hetzelfde token twee keer gebruiken wordt geweigerd", async () => {
    const t = token();
    const eerste = await vraag("/machine/stand", { bearer: t });
    assert.equal(eerste.status, 200, eerste.tekst.slice(0, 200));
    const tweede = await vraag("/machine/stand", { bearer: t });
    assert.equal(tweede.status, 401, "een herhaald token hoort geweigerd te worden");
    assert.match(String(tweede.lichaam["fout"] ?? ""), /al gebruikt/);
  });

  test("5b · de jti wordt vastgelegd met zijn herkomst, en verlopen rijen gaan weg", async () => {
    const t = token({ run_id: "replay-9002" });
    await vraag("/machine/stand", { bearer: t });
    const rijen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{
        repository: string;
        workflow_ref: string;
        run_id: string;
        handeling: string;
      }>(
        `select repository, workflow_ref, run_id, handeling
           from intel.machine_tokens where run_id = $1`,
        ["replay-9002"],
      );
      return r.rows;
    });
    assert.equal(rijen.length, 1);
    assert.equal(rijen[0]!.repository, REPOSITORY);
    assert.match(rijen[0]!.handeling, /GET/);

    /* De opruiming: een rij die al verlopen is, hoort bij de volgende
       verificatie te verdwijnen. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.machine_tokens
           (jti, organisatie_id, repository, workflow_ref, run_id, handeling, verloopt_op)
         values ('oud-token', $1, $2, $3, 'oud', 'GET /x', now() - interval '1 hour')`,
        [org, REPOSITORY, `${REPOSITORY}/${WORKFLOW}@${REF}`],
      );
    });
    await vraag("/machine/stand", { bearer: token() });
    const oud = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query("select 1 from intel.machine_tokens where jti = 'oud-token'");
      return r.rowCount ?? 0;
    });
    assert.equal(oud, 0, "een verlopen rij hoort opgeruimd te zijn");
  });

  /* ================================================================
     6 — de poort neemt geen inhoud en geen identiteit uit het lichaam
     ================================================================ */

  test("6 · een andere recordhash legt niets vast, en meegestuurde inhoud doet niets", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const voor = await besluitenVan(versieId);

    const a = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token(),
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        bewijs: {
          recordHash: "0".repeat(64),
          waar: "verzonnen",
          beleidVersie: beleid,
          /* vijandige velden: inhoud die de poort niet mag aannemen */
          recordInhoud: '{"titel":"gekaapt"}',
          body_markdown: "gekaapte tekst",
          titel: "gekaapt",
        },
        recordInhoud: '{"titel":"gekaapt"}',
      },
    });
    assert.equal(a.status, 409, a.tekst.slice(0, 300));

    const na = await besluitenVan(versieId);
    assert.equal(na.length, voor.length, "er hoort geen besluitregel bij te komen");

    const tekstNa = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ titel: string; body_markdown: string }>(
        "select titel, body_markdown from intel.inhoud_versies where id = $1",
        [versieId],
      );
      return r.rows[0]!;
    });
    assert.ok(!tekstNa.titel.includes("gekaapt"), "de titel hoort onaangeroerd te zijn");
    assert.ok(!tekstNa.body_markdown.includes("gekaapte"), "de body hoort onaangeroerd te zijn");
  });

  test("6b · een organisatieId in het verzoek bestuurt een andere organisatie niet", async () => {
    const beleid = await zetBeleid(andereOrg);
    const andereAuteur = await maakGebruiker(db, andereOrg, `a${teller}@test.nl`, "analist");
    const { versieId } = await maakGoedgekeurdeVersie(andereOrg, andereAuteur);
    const voor = await besluitenVan(versieId, andereOrg);

    const a = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token(),
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        organisatieId: andereOrg,
        bewijs: { recordHash: "0".repeat(64), waar: "x", beleidVersie: beleid, organisatieId: andereOrg },
      },
    });
    assert.equal(a.status, 409, a.tekst.slice(0, 200));
    const na = await besluitenVan(versieId, andereOrg);
    assert.deepEqual(na, voor, "in de andere organisatie hoort niets te veranderen");
  });

  test("6c · een run_id in het LICHAAM doet niets; alleen het token telt", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel, max: 50 });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(opdracht !== undefined, kortRapport(rij, versieId));

    const a = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "echte-run-1" }),
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        bewijs: {
          recordHash: opdracht.recordHash,
          waar: "proef",
          beleidVersie: beleid,
          run_id: "gelogen-run",
          runId: "gelogen-run",
        },
      },
    });
    assert.equal(a.status, 200, a.tekst.slice(0, 300));
    const besluiten = await besluitenVan(versieId);
    const record = besluiten.find((b) => b.poortresultaten["fase"] === "RECORD_GESCHREVEN");
    assert.ok(record !== undefined);
    assert.equal(record.poortresultaten["runId"], "echte-run-1", "de run komt uit het token");
    assert.equal(record.poortresultaten["gemetenDoor"], "uitvoerder");
  });

  /* ================================================================
     7 — de toestandsmachine en de runbinding
     ================================================================ */

  test("7 · een onbekende fase geeft 400 en noemt de geldige fasen", async () => {
    for (const fase of ["GEPUBLICEERD", "record_geschreven", "", "LIVE"]) {
      const a = await vraag("/machine/uitgifte/1", {
        methode: "POST",
        bearer: token(),
        lichaam: { fase, bewijs: { beleidVersie: "x" } },
      });
      assert.equal(a.status, 400, `'${fase}' gaf ${a.status}`);
      for (const geldig of [
        "RECORD_GESCHREVEN",
        "PR_AANGEMAAKT",
        "PR_GEMERGED",
        "LIVE_GEVERIFIEERD",
        "GEBLOKKEERD",
      ]) {
        assert.match(String(a.lichaam["fout"] ?? ""), new RegExp(geldig));
      }
    }
  });

  test("7b · een fase uit zijn orde geeft 409 en schrijft niets", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const voor = await besluitenVan(versieId);
    for (const [fase, bewijs] of [
      ["PR_GEMERGED", { mergeCommit: "a".repeat(40), checksGroen: ["x"], beleidVersie: beleid }],
      ["PR_AANGEMAAKT", { branch: "b", commit: "a".repeat(40), beleidVersie: beleid }],
      ["LIVE_GEVERIFIEERD", { gemergedInMain: true, beleidVersie: beleid }],
    ] as const) {
      const a = await vraag(`/machine/uitgifte/${versieId}`, {
        methode: "POST",
        bearer: token(),
        lichaam: { fase, bewijs },
      });
      assert.equal(a.status, 409, `${fase} gaf ${a.status}: ${a.tekst.slice(0, 160)}`);
    }
    assert.deepEqual(await besluitenVan(versieId), voor);
  });

  test("8 · een ANDERE run mag een lopende keten niet overnemen", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel, max: 50 });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(opdracht !== undefined, kortRapport(rij, versieId));

    /* Run A schrijft het record. */
    const eerste = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-A" }),
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        bewijs: { recordHash: opdracht.recordHash, waar: "run-A", beleidVersie: beleid },
      },
    });
    assert.equal(eerste.status, 200, eerste.tekst.slice(0, 300));

    /* Run B probeert de volgende fase te melden. Zijn token is ECHT —
       het is ondertekend, de claims kloppen, de fase-orde klopt — en
       toch hoort dit geweigerd te worden. */
    const vreemde = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-B" }),
      lichaam: {
        fase: "PR_AANGEMAAKT",
        bewijs: { branch: "publicatie/x", commit: "b".repeat(40), beleidVersie: beleid },
      },
    });
    assert.equal(vreemde.status, 409, vreemde.tekst.slice(0, 300));
    assert.match(String(vreemde.lichaam["fout"] ?? ""), /run/);

    /* Run A mag wel. */
    const eigen = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-A" }),
      lichaam: {
        fase: "PR_AANGEMAAKT",
        bewijs: { branch: "publicatie/x", commit: "b".repeat(40), prNummer: 7, beleidVersie: beleid },
      },
    });
    assert.equal(eigen.status, 200, eigen.tekst.slice(0, 300));

    /* En na een officiële stranding mag een ANDERE run hervatten. */
    const gestrand = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-A" }),
      lichaam: {
        fase: "GEBLOKKEERD",
        bewijs: { stap: "merge", fout: "GitHub gaf 502", beleidVersie: beleid },
      },
    });
    assert.equal(gestrand.status, 200, gestrand.tekst.slice(0, 200));
    const hervat = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-C" }),
      lichaam: {
        fase: "PR_GEMERGED",
        bewijs: {
          mergeCommit: "c".repeat(40),
          checksGroen: ["Release 1", "Release 2", "Beveiliging"],
          beleidVersie: beleid,
        },
      },
    });
    assert.equal(hervat.status, 200, hervat.tekst.slice(0, 300));
  });

  test("9 · een herhaalde legitieme melding is idempotent", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel, max: 50 });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(opdracht !== undefined, kortRapport(rij, versieId));

    const lichaam = {
      fase: "RECORD_GESCHREVEN",
      bewijs: { recordHash: opdracht.recordHash, waar: "idem", beleidVersie: beleid },
    };
    const eerste = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-idem" }),
      lichaam,
    });
    assert.equal(eerste.status, 200, eerste.tekst.slice(0, 300));
    const voor = await besluitenVan(versieId);

    /* Een NIEUW token (want een token werkt één keer) met dezelfde run
       en dezelfde melding. */
    const tweede = await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-idem" }),
      lichaam,
    });
    assert.equal(tweede.status, 200, "een herhaalde legitieme melding is geen fout");
    assert.deepEqual(await besluitenVan(versieId), voor, "en levert geen tweede regel op");
  });

  /* ================================================================
     10 — herkomst in het logboek, en de sessieweg blijft dicht
     ================================================================ */

  test("10 · de regels van de poort zijn 'systeem' met een grond uit het register", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakGoedgekeurdeVersie();
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel, max: 50 });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(opdracht !== undefined, kortRapport(rij, versieId));
    await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-herkomst" }),
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        bewijs: { recordHash: opdracht.recordHash, waar: "herkomst", beleidVersie: beleid },
      },
    });
    await vraag(`/machine/uitgifte/${versieId}`, {
      methode: "POST",
      bearer: token({ run_id: "run-herkomst" }),
      lichaam: {
        fase: "PR_AANGEMAAKT",
        bewijs: { branch: "publicatie/h", commit: "d".repeat(40), beleidVersie: beleid },
      },
    });

    const besluiten = await besluitenVan(versieId);
    const vanDePoort = besluiten.filter((b) =>
      ["RECORD_GESCHREVEN", "PR_AANGEMAAKT"].includes(String(b.poortresultaten["fase"])),
    );
    assert.equal(vanDePoort.length, 2, JSON.stringify(besluiten.map((b) => b.poortresultaten)));
    for (const b of vanDePoort) {
      assert.equal(b.actor_soort, "systeem", "een werkstroom is geen persoon");
      assert.equal(b.door_gebruiker_id, null);
      assert.equal(b.beleid_versie, beleid, "0052 eist het mandaat bij een automatisch besluit");
      const grond = String(b.poortresultaten["grond"] ?? "");
      assert.ok(grond in SYSTEEMGRONDEN, `'${grond}' staat niet in SYSTEEMGRONDEN`);
      assert.equal(b.poortresultaten["runId"], "run-herkomst");
      assert.equal(b.poortresultaten["repository"], REPOSITORY);
    }
  });

  test("11 · een menselijk sessiekoekje opent /machine niet, en een token opent /studio niet", async () => {
    const epoch = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ sessie_epoch: number }>(
        "select sessie_epoch from intel.gebruikers where id = $1",
        [beheerder],
      );
      return Number(r.rows[0]!.sessie_epoch);
    });
    const koekje = `intel_sessie=${maakSessieCookie(beheerder, org, epoch)}`;

    /* Het koekje is echt: het opent /studio. */
    const studio = await fetch(`${basis}/studio`, { headers: { cookie: koekje }, redirect: "manual" });
    assert.equal(studio.status, 200, "het koekje hoort geldig te zijn");

    for (const r of DRIE_ROUTES) {
      const a = await vraag(r.pad, {
        methode: r.methode,
        bearer: null,
        lichaam: r.lichaam,
        kop: { cookie: koekje },
      });
      assert.equal(a.status, 401, `${r.naam} met een sessiekoekje gaf ${a.status}`);
    }

    /* En omgekeerd: een OIDC-token is geen sessie. */
    const metToken = await fetch(`${basis}/studio`, {
      headers: { authorization: `Bearer ${token()}` },
      redirect: "manual",
    });
    assert.equal(metToken.status, 302, "een machinetoken hoort niet in de Studio te komen");
  });
});
