/* ============================================================
   TEST — de autonome uitgifte, van goedkeuring tot publieke URL
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, EN WAAROM HET EEN INTEGRATIETOETS MOET ZIJN.

   De autonome uitgifte heeft twee uitvoeringsplekken: de SERVER beslist
   en boekhoudt (die heeft de database), de UITVOERDER schrijft en
   merget (die heeft de repo met de generator). Een eenheidstoets met
   nepfuncties zou precies dat verschil wegpoetsen, en juist daar zit het
   gevaar: een uitvoerder die zijn eigen inhoud schrijft, een fase die
   uit de orde loopt, een melding zonder bewijs.

   Deze suite speelt die splitsing ECHT na:

     · de server draait tegen een eigen wegwerpdatabase;
     · de uitvoerder is een VOLLEDIGE kopie van deze repository
       (git archive van HEAD in een tijdelijke map, met een eigen bare
       remote), waarin de ECHTE generator van Release 1 draait;
     · de merge is een echte push naar main van die eigen remote;
     · de live-verificatie krijgt een haler die de ECHT gegenereerde
       bestanden uit die kopie serveert.

   ER WORDT NIETS GEPUBLICEERD. Geen enkel verzoek gaat naar GitHub of
   naar vibeenergy.nl; alles staat in een tijdelijke map en een
   wegwerpdatabase.

   DE ZAKEN, VAN GELUKKIG PAD NAAR VIJANDIG:

     1   de hele keten in één gang: vijf fasen, vijf regels in het logboek
     2   het dagplafond en de stroomonderbreker
     3   beide beleidsschakelaars moeten aan
     4   hoog risico komt er langs geen enkele weg in
     5   een MENSELIJK goedgekeurd artikel blijft buiten de autonome rij
     6   een andere hash dan de server bouwde legt niets vast
     7   fasen kunnen niet uit hun orde
     8   dezelfde fase twee keer melden is geen fout en geen duplicaat
     9   een gelogen mergemelding haalt de live-verificatie niet
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, beforeEach, describe, test } from "node:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

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
import { automatischPubliceren } from "../../src/inhoud/autopublicatie.ts";
import { inhoudAfdruk } from "../../src/inhoud/concept.ts";
import { keurGoed } from "../../src/inhoud/publiceer.ts";
import { maakGit } from "../../src/publicatie/pr.ts";
import type { Haler } from "../../src/publicatie/verificatie.ts";
import {
  MAX_AUTONOME_PUBLICATIES_PER_DAG,
  MAX_OPEENVOLGENDE_FOUTEN,
  aanvaardMerge,
  aanvaardPr,
  aanvaardRecord,
  huidigeFase,
  maakUitgifteWachtrij,
  meldUitgifteFout,
  stopredenen,
  verifieerUitgifteLive,
} from "../../src/uitgifte/opdracht.ts";

const uitvoeren = promisify(execFile);

/** De werkboom waarin deze toets draait; HEAD is er altijd. */
const REPO = join(dirname(new URL(import.meta.url).pathname), "..", "..", "..");

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/**
 * De teller als LETTERREEKS: 1 wordt 'a', 27 wordt 'aa'.
 *
 * WAAROM GEEN CIJFER. Het kenmerk gaat in de body van het bericht, en
 * poort 7 (`geen_verzonnen_getallen`) eist dat elk cijfer in de tekst
 * terugkomt in een gebonden uitspraak. Een teller in cijfers zou die
 * poort dus laten vallen op een getal dat niets beweert.
 *
 * EN WAAROM NIET DE SLUG. Mijn eerste versie nam `slug.replace(/[^a-z]/g, "")`,
 * en dat strijkt juist het volgnummer weg: elke zaak kreeg het kenmerk
 * 'uitgiftezaak' en dus dezelfde afdruk — waarna voorwaarde 8 elke
 * versie na de eerste als duplicaat weigerde. Gemeten, en precies de
 * val die deze helper nu dichtzet.
 */
function kenmerkVan(nummer: number): string {
  let rest = Math.max(0, nummer - 1);
  let uit = "";
  do {
    uit = `${LETTERS.charAt(rest % 26)}${uit}`;
    rest = Math.floor(rest / 26);
  } while (rest > 0);
  return uit;
}

describe("de autonome uitgifte", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let chef = 0;
  let auteur = 0;
  let werk = "";
  let site = "";
  let remote = "";
  /** De map met data/sitekennis.json in de kopie: de routebron van de server. */
  let intelWortel = "";
  let teller = 0;

  /**
   * Een VOLLEDIGE kopie van deze repository met een eigen bare remote.
   *
   * UIT HEAD **PLUS DE WERKBOOM**. `git archive HEAD` geeft de laatste
   * COMMIT; deze suite toetst juist wijzigingen aan de generator en aan
   * het publicatiecontract die nog ongecommit in de werkboom staan. Met
   * alleen HEAD meet hij de OUDE generator en weigert die een
   * beleidsgoedkeuring — gemeten: "GOEDGEKEURD zonder goedgekeurd_door",
   * precies de regel die deze ronde vervangt.
   *
   * Niet de hele map kopiëren: dan komen node_modules, .env en losse
   * werkbestanden mee en meet de toets de rommel van de machine waarop
   * hij draait. In CI is de werkboom gelijk aan HEAD, dus daar
   * verandert de overlay niets.
   *
   * ELKE KOPIE IS EEN EIGEN SITE. Zaak 10 heeft er een eigen nodig,
   * want main van de gedeelde kopie draagt dan al de artikelen van de
   * eerdere zaken — en die lijken per constructie op elkaar, waardoor
   * poort 11 van de generator terecht afbreekt.
   */
  async function maakSiteKopie(naam: string): Promise<{ site: string; remote: string }> {
    const doel = join(werk, naam);
    const bare = join(werk, `${naam}-remote.git`);
    await mkdir(doel, { recursive: true });
    await uitvoeren("bash", [
      "-c",
      `git -C ${JSON.stringify(REPO)} archive HEAD | tar -x -C ${JSON.stringify(doel)}`,
    ]);
    const gewijzigd = (
      await uitvoeren("git", ["-C", REPO, "diff", "--name-only", "HEAD"], { encoding: "utf8" })
    ).stdout
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    for (const bestand of gewijzigd) {
      const bron = join(REPO, bestand);
      if (!existsSync(bron)) continue;
      await mkdir(dirname(join(doel, bestand)), { recursive: true });
      await writeFile(join(doel, bestand), await readFile(bron));
    }
    await uitvoeren("git", ["init", "--bare", "-b", "main", bare]);
    await uitvoeren("git", ["init", "-b", "main", doel]);
    const git = maakGit(doel);
    await git(["remote", "add", "origin", bare]);
    await git(["add", "-A"]);
    await git([
      "-c",
      "user.name=toets",
      "-c",
      "user.email=t@t.nl",
      "commit",
      "-m",
      "basis uit HEAD plus werkboom",
    ]);
    await git(["push", "-u", "origin", "main"]);
    return { site: doel, remote: bare };
  }

  before(async () => {
    db = await maakWegwerpdatabase("uitgifte");
    org = await maakOrganisatie(db, "uitgifte-org");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");

    werk = await mkdtemp(join(tmpdir(), "intel-uitgifte-"));
    const eerste = await maakSiteKopie("site");
    site = eerste.site;
    remote = eerste.remote;
    intelWortel = join(site, "intelligence");

    assert.ok(
      existsSync(join(intelWortel, "data", "sitekennis.json")),
      "de kopie hoort het sitekennis-artefact te bevatten; dat is de routebron van de server",
    );
  });

  after(async () => {
    await rm(werk, { recursive: true, force: true });
    await db.opruimen();
    configVergeten();
  });

  /* ---------------- hulpmiddelen ---------------- */

  /** Zet een beleidsrij met beide schakelaars naar keuze. */
  async function zetBeleid(
    o: { autoAan?: boolean; uitgifteAan?: boolean; maxRisico?: string; org?: number } = {},
  ): Promise<string> {
    const doel = o.org ?? org;
    const versie = `uitgifte-${(teller += 1)}`;
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doel)]);
      await c.query("update intel.publicatiebeleid set actief = false where organisatie_id = $1", [doel]);
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1, $2, $3, $4, $5, array['nieuw_artikel'], 1, 3, true)`,
        [doel, versie, o.autoAan ?? true, o.uitgifteAan ?? true, o.maxRisico ?? "laag"],
      );
    });
    return versie;
  }

  /** Een publiceerbare, dragende versie met een echte toezichthoudersbron. */
  async function maakVersie(
    o: { risico?: "laag" | "midden" | "hoog"; org?: number; auteur?: number } = {},
  ): Promise<{ versieId: number; slug: string }> {
    const doel = o.org ?? org;
    const slug = `uitgifte-zaak-${(teller += 1)}`;
    const v = await maakDragendeVersie(db, doel, {
      slug,
      risico: o.risico ?? "laag",
      aangemaaktDoor: o.auteur ?? auteur,
      publiceerbaar: true,
      /* 'acm-besluiten' is in src/bronnen/register.ts een toezichthouder
         en dus TOEZICHTHOUDER: een soort die een bericht zelfstandig mag
         dragen. Een verzonnen sleutel valt terug op MARKTPARTIJ en dan
         maakt de generator geen pagina. */
      bronSleutel: "acm-besluiten",
    });

    /* DE GEBEURTENIS HEEFT EEN DATUM NODIG.
       maakDragendeVersie() schrijft zijn markt_gebeurtenis zonder
       `gebeurd_op`, en voorwaarde 7 van de autopublicatie weigert dan
       terecht: "zonder datum is actualiteit niet te meten". Dat is geen
       fout in het harnas — de meeste toetsen publiceren niet — maar
       deze suite moet er wél langs, dus zet hij de datum hier. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doel)]);
      await c.query(
        `update intel.markt_gebeurtenissen g
            set gebeurd_op = now() - interval '1 day'
          where g.organisatie_id = $1
            and g.id = (select k.gebeurtenis_id
                          from intel.inhoud_versies v
                          join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
                         where v.id = $2)`,
        [doel, v.versieId],
      );
    });
    /* ELKE VERSIE ZIJN EIGEN TEKST, EN DAT IS GEEN NETHEID.
       De afdruk wordt gerekend uit titel, direct antwoord, body en
       structured data — NIET uit het pad. maakDragendeVersie() geeft
       elke versie dezelfde tekst, dus zonder onderscheid krijgen alle
       zaken dezelfde afdruk en weigert voorwaarde 8 (duplicaat) elke
       versie ná de eerste die echt is gepubliceerd. intel.publicaties
       is append-only, dus die eerste publicatie blijft de hele run
       staan. Het kenmerk is een WOORD en geen getal: poort 7
       (geen_verzonnen_getallen) eist dat elk cijfer in de body
       terugkomt in een gebonden uitspraak. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doel)]);
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
      /* GENOEG VERSCHIL VOOR POORT 11 EN 12 VAN DE GENERATOR.
         Eén afwijkende zin is niet genoeg: scripts/seo/audit.mjs meet
         duplicaatinhoud met een jaccard-index en kannibalisatie op
         gelijke <title> en H1. Gemeten met alleen een kenmerkzin:
         "jaccard 0.93, overlap 97%" en "dezelfde <title>" — en dus een
         FAIL van de hele generatorketen. Dat is precies de bescherming
         die §1 vraagt (geen vrijwel identieke artikelen), dus de
         fixture hoort eraan te voldoen in plaats van hem te omzeilen.
         Daarom krijgt elke zaak een eigen titel, een eigen direct
         antwoord en drie eigen alinea's. */
      const k = kenmerkVan(teller);
      const titel = `Netbeheerder ${k.toUpperCase()} verruimt de aansluittermijn voor bedrijven`;
      const direct = `De aansluittermijn in regio ${k.toUpperCase()} is verruimd voor zakelijke aanvragen.`;
      const body =
        `De netbeheerder in regio ${k.toUpperCase()} verruimt de termijn waarop bedrijven een ` +
        `zwaardere aansluiting kunnen aanvragen.\n\n` +
        `## Wat er is vastgelegd\n\n` +
        `Het besluit over regio ${k.toUpperCase()} noemt de nieuwe termijn en de voorwaarden ` +
        `waaronder een bedrijf er aanspraak op maakt. De oude termijn blijft gelden voor lopende ` +
        `aanvragen in dezelfde regio.\n\n` +
        `## Wat dit voor u betekent\n\n` +
        `Wie in regio ${k.toUpperCase()} op een zwaardere aansluiting wacht, krijgt meer ruimte om ` +
        `zijn aanvraag te onderbouwen. Wilt u weten wat dit voor uw pand betekent? ` +
        `[Plan een gesprek](/contact).\n`;
      const afdruk = inhoudAfdruk({
        titel,
        directAntwoord: direct,
        bodyMarkdown: body,
        structuredData: rij.structured_data,
      });
      await c.query(
        `update intel.inhoud_versies
            set titel = $2, direct_antwoord = $3, body_markdown = $4, inhoud_afdruk = $5
          where id = $1`,
        [v.versieId, titel, direct, body, afdruk],
      );
    });

    return { versieId: v.versieId, slug };
  }

  /** De uitvoerder: schrijft de bytes, bouwt de site, commit en push. */
  async function uitvoerderDoetZijnWerk(
    opdracht: {
      bestandspad: string;
      recordInhoud: string;
      branch: string;
      commitBericht: string;
    },
    /* DE GENERATORRUN IS NIET ALTIJD DE VRAAG. Zaak 1 en zaak 10 meten
       juist wat de generator doet; de zaken over de toestandsmachine
       hebben alleen een commit nodig. Die hoeven dan ook niet 4 seconden
       aan sitebouw te betalen, en — belangrijker — ze zouden stranden op
       poort 11 van de generator omdat twee fixtures per constructie op
       elkaar lijken. Dat is een EIGEN zaak en niet iets wat elke zaak
       opnieuw moet bewijzen. */
    opties: { readonly bouw?: boolean; readonly site?: string } = {},
  ): Promise<{ commit: string }> {
    const werkboom = opties.site ?? site;
    const git = maakGit(werkboom);
    await git(["checkout", "-B", opdracht.branch, "main"]);
    const doel = join(werkboom, opdracht.bestandspad);
    await mkdir(dirname(doel), { recursive: true });
    /* LETTERLIJK DE BYTES UIT DE OPDRACHT. De uitvoerder stelt niets
       samen; dat is de hele reden dat de opdracht de inhoud draagt. */
    await writeFile(doel, opdracht.recordInhoud, "utf8");

    /* DE ECHTE GENERATOR. Niet een nepversie: die schreef in oudere
       toetsen alleen nieuwe bestanden en verborg daarmee twee echte
       defecten (#79). */
    if (opties.bouw !== false) {
    try {
      await uitvoeren("node", ["scripts/seo/bouw.mjs", "--offline"], {
        cwd: werkboom,
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch (e) {
      /* DE UITVOER VAN DE GENERATOR HOORT IN DE FOUT. Zonder deze
         tekst zegt een rode toets alleen "Command failed", en dan is
         de reden van zestien poorten niet te zien. */
      const f = e as { stdout?: string; stderr?: string; message?: string };
      const staart = `${f.stdout ?? ""}\n${f.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");
      throw new Error(`scripts/seo/bouw.mjs --offline faalde:\n${staart}`);
    }
    }

    await git(["add", "-A"]);
    await git([
      "-c",
      "user.name=vibe-intelligence",
      "-c",
      "user.email=intelligence@vibeenergy.nl",
      "commit",
      "-m",
      opdracht.commitBericht,
    ]);
    const commit = (await git(["rev-parse", "HEAD"])).trim();
    await git(["push", "-u", "origin", opdracht.branch]);
    return { commit };
  }

  /** De merge: een echte push naar main van de eigen remote. */
  async function uitvoerderMergt(branch: string, eigenSite?: string): Promise<string> {
    const git = maakGit(eigenSite ?? site);
    await git(["checkout", "main"]);
    await git(["merge", "--no-ff", "-m", `merge ${branch}`, branch]);
    const merge = (await git(["rev-parse", "HEAD"])).trim();
    await git(["push", "origin", "main"]);
    return merge;
  }

  /** Een haler die de ECHT gegenereerde bestanden uit de kopie serveert. */
  function haalUitKopie(): Haler {
    return async (url: string) => {
      const pad = new URL(url).pathname.replace(/^\//, "");
      const kandidaten = [join(site, pad), join(site, `${pad}.html`)];
      for (const k of kandidaten) {
        if (existsSync(k)) return { status: 200, tekst: await readFile(k, "utf8") };
      }
      return { status: 404, tekst: "" };
    };
  }

  async function fase(versieId: number) {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      huidigeFase(c, org, versieId),
    );
  }

  /** Het logboek van een versie: de fasen in volgorde. */
  async function fasen(versieId: number, doelOrg = org): Promise<string[]> {
    return metOrganisatie(db.pool, { organisatieId: doelOrg }, async (c) => {
      const r = await c.query<{ fase: string | null }>(
        `select poortresultaten->>'fase' as fase
           from intel.publicatiebesluiten
          where organisatie_id = $1 and inhoud_versie_id = $2
          order by id`,
        [doelOrg, versieId],
      );
      return r.rows.map((x) => x.fase ?? "GEEN");
    });
  }

  /* ================================================================
     1 — de hele keten in één gang
     ================================================================ */

  test("1 · van beleidsgoedkeuring tot LIVE_GEVERIFIEERD, met de echte generator", async () => {
    const beleid = await zetBeleid();
    const { versieId, slug } = await maakVersie();

    /* ---------- de server keurt goed, en publiceert NIET ----------
       Met auto_uitgifte_aan AAN stopt de goedkeuringsronde na de
       goedkeuring: het registerrecord schrijft een uitvoerder met een
       echte werkboom. */
    const ronde = await automatischPubliceren(db.pool, org, {});
    assert.equal(ronde.beleidReden, null, JSON.stringify(ronde.geweigerd));
    assert.equal(
      ronde.wachtOpUitgifte.length,
      1,
      `de ronde hoort deze versie aan de uitgifte door te geven: ${JSON.stringify(ronde.geweigerd)}`,
    );
    assert.equal(ronde.gepubliceerd.length, 0, "en zelf niets te publiceren");
    assert.deepEqual(await fasen(versieId), ["GOEDGEKEURD"]);

    /* ---------- de server geeft een opdracht af ---------- */
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.deepEqual(rij.stop, [], JSON.stringify(rij.stop));
    assert.equal(rij.opdrachten.length, 1, JSON.stringify(rij.geweigerd));
    const opdracht = rij.opdrachten[0]!;
    assert.equal(opdracht.inhoudVersieId, versieId);
    assert.equal(opdracht.bestandspad, `data/inhoud/nieuws/${slug}.json`);
    assert.equal(opdracht.branch, `publicatie/${slug}-v${versieId}`);
    assert.match(opdracht.recordHash, /^[0-9a-f]{64}$/);
    assert.ok(opdracht.recordInhoud.includes(`"route"`), "de opdracht draagt de bytes zelf");
    assert.ok(
      opdracht.commitBericht.includes(`publicatie: nieuws/${slug}`),
      "en een commitbericht in de huisstijl",
    );

    /* HET RECORD NOEMT ZIJN GOEDKEURINGSCATEGORIE. Dat is de hele
       reden dat de generator en het publicatiecontract een
       beleidsgoedkeuring kunnen onderscheiden van geen goedkeuring. */
    const recordObject = JSON.parse(opdracht.recordInhoud) as Record<string, unknown>;
    assert.equal(recordObject["redactionele_staat"], "GOEDGEKEURD");
    assert.equal(recordObject["goedkeuring_soort"], "beleid");
    assert.equal(recordObject["goedkeurend_beleid"], beleid);
    assert.equal(recordObject["risico_klasse"], "laag");
    assert.equal(recordObject["goedgekeurd_door"], "", "er was geen mens, en dat liegt het record niet");

    /* ---------- de uitvoerder schrijft, bouwt, commit en pusht ---------- */
    const { commit } = await uitvoerderDoetZijnWerk(opdracht);

    /* DE ECHTE GENERATOR HEEFT DE PAGINA GEMAAKT. Dit is de meting die
       een nepgenerator niet kan geven: zonder een geldige
       goedkeuringscategorie slaat weigerNieuws() het bericht over en
       bestaat dit bestand niet. */
    const htmlPad = join(site, "nieuws", `${slug}.html`);
    /* DE REDEN STAAT IN routes.json. weigerNieuws() in
       scripts/seo/bouw-routes.mjs zet een geweigerd bericht op PENDING
       met 'Niet gepubliceerd: <reden>'. Zonder die reden in de
       foutmelding zegt een rode toets alleen DAT het niet lukte. */
    const naBouw = JSON.parse(
      await readFile(join(site, "data", "seo", "routes.json"), "utf8"),
    ) as { routes: { route: string; staat: string; reden: string }[] };
    const mijne = naBouw.routes.find((r) => r.route === `nieuws/${slug}`);
    assert.ok(
      existsSync(htmlPad),
      `${htmlPad} hoort door de generator gemaakt te zijn. Routeregister zegt: ` +
        `${mijne === undefined ? "deze route staat niet in routes.json" : `${mijne.staat} — ${mijne.reden}`}`,
    );
    const html = await readFile(htmlPad, "utf8");
    assert.ok(
      html.includes(`<link rel="canonical" href="https://www.vibeenergy.nl/nieuws/${slug}">`),
      "met een zelfverwijzende canonical",
    );

    /* ---------- fase 2: het record, met de hash als binding ---------- */
    const record = await aanvaardRecord(
      db.pool,
      org,
      versieId,
      { recordHash: opdracht.recordHash, waar: `${opdracht.branch}@${commit}`, beleidVersie: beleid },
      { intelligenceWortel: intelWortel },
    );
    assert.ok(record.ok, record.reden);
    assert.ok(record.publicatieId !== null, "er hoort een publicatierij te zijn");

    /* ---------- fase 3: de pull request ---------- */
    const pr = await aanvaardPr(db.pool, org, versieId, {
      branch: opdracht.branch,
      commit,
      prNummer: 4242,
      prUrl: "https://github.com/MounirVB/vibe-website/pull/4242",
      beleidVersie: beleid,
    });
    assert.ok(pr.ok, pr.reden);

    /* ---------- fase 4: de merge, echt, naar main van de eigen remote ---------- */
    const mergeCommit = await uitvoerderMergt(opdracht.branch);
    const merge = await aanvaardMerge(db.pool, org, versieId, {
      mergeCommit,
      checksGroen: [
        "Release 1 — SEO/GEO-poorten en reproduceerbaarheid",
        "Release 2 — typecheck, tests en invarianten",
        "Geheimen, kwetsbaarheden en publicatiecontract",
      ],
      beleidVersie: beleid,
    });
    assert.ok(merge.ok, merge.reden);

    /* ---------- fase 5: en staat hij publiek? DE SERVER MEET ---------- */
    const live = await verifieerUitgifteLive(
      db.pool,
      org,
      versieId,
      { gemergedVolgensUitvoerder: true, beleidVersie: beleid },
      { haal: haalUitKopie() },
    );
    assert.ok(
      live.ok,
      `de live-verificatie hoort te slagen:\n${live.reden}\n${live.grendels
        .map((g) => `  ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}`)
        .join("\n")}`,
    );

    /* ---------- en het logboek draagt alle vijf de fasen, in orde ---------- */
    assert.deepEqual(await fasen(versieId), [
      "GOEDGEKEURD",
      "RECORD_GESCHREVEN",
      "PR_AANGEMAAKT",
      "PR_GEMERGED",
      "LIVE_GEVERIFIEERD",
    ]);
    assert.equal((await fase(versieId)).fase, "LIVE_GEVERIFIEERD");
  });

  test("8 · dezelfde fase twee keer melden levert geen tweede regel op", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    const ronde = await automatischPubliceren(db.pool, org, {});
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(
      opdracht !== undefined,
      `geen opdracht voor versie ${versieId}: stop=${JSON.stringify(rij.stop)} ` +
        `geweigerd=${JSON.stringify(rij.geweigerd)} vandaag=${rij.vandaagGepubliceerd} ` +
        `rondeWacht=${JSON.stringify(ronde.wachtOpUitgifte)} rondeWeigerde=${JSON.stringify(ronde.geweigerd)}`,
    );
    const { commit } = await uitvoerderDoetZijnWerk(opdracht, { bouw: false });
    await aanvaardRecord(
      db.pool,
      org,
      versieId,
      { recordHash: opdracht.recordHash, waar: "eerste melding", beleidVersie: beleid },
      { intelligenceWortel: intelWortel },
    );
    await aanvaardPr(db.pool, org, versieId, {
      branch: opdracht.branch,
      commit,
      prNummer: 1,
      prUrl: null,
      beleidVersie: beleid,
    });
    const voor = await fasen(versieId);
    const nogmaals = await aanvaardPr(db.pool, org, versieId, {
      branch: opdracht.branch,
      commit,
      prNummer: 1,
      prUrl: null,
      beleidVersie: beleid,
    });
    assert.ok(nogmaals.ok, "dezelfde melding twee keer is geen fout");
    assert.deepEqual(await fasen(versieId), voor, "en levert geen tweede regel op");
  });

  test("9 · een gelogen mergemelding haalt de live-verificatie niet", async () => {
    const beleid = await zetBeleid();
    const { versieId, slug } = await maakVersie();
    const ronde = await automatischPubliceren(db.pool, org, {});
    const rij = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(
      opdracht !== undefined,
      `geen opdracht voor versie ${versieId}: stop=${JSON.stringify(rij.stop)} ` +
        `geweigerd=${JSON.stringify(rij.geweigerd)} vandaag=${rij.vandaagGepubliceerd} ` +
        `rondeWacht=${JSON.stringify(ronde.wachtOpUitgifte)} rondeWeigerde=${JSON.stringify(ronde.geweigerd)}`,
    );

    /* De uitvoerder schrijft en commit WEL, maar merget NIET — en meldt
       toch een merge. De server meet daarna de publieke URL en vindt
       niets, want de generator heeft op main niets gebouwd. */
    const { commit } = await uitvoerderDoetZijnWerk(opdracht, { bouw: false });
    const git = maakGit(site);
    await git(["checkout", "main"]);
    /* main is nu zonder het artikel; de werkboom draagt het bestand dus
       niet meer en de haler vindt de pagina niet. */
    await aanvaardRecord(
      db.pool,
      org,
      versieId,
      { recordHash: opdracht.recordHash, waar: "melding", beleidVersie: beleid },
      { intelligenceWortel: intelWortel },
    );
    await aanvaardPr(db.pool, org, versieId, {
      branch: opdracht.branch,
      commit,
      prNummer: 2,
      prUrl: null,
      beleidVersie: beleid,
    });
    await aanvaardMerge(db.pool, org, versieId, {
      mergeCommit: commit,
      checksGroen: ["Release 1", "Release 2", "Beveiliging"],
      beleidVersie: beleid,
    });

    const live = await verifieerUitgifteLive(
      db.pool,
      org,
      versieId,
      { gemergedVolgensUitvoerder: true, beleidVersie: beleid },
      { haal: haalUitKopie() },
    );
    assert.equal(live.ok, false, "zonder pagina op main hoort de verificatie te falen");
    assert.ok(
      live.grendels.some((g) => !g.ok),
      "en er hoort een rode grendel bij te staan",
    );
    const na = await fasen(versieId);
    assert.ok(
      !na.includes("LIVE_GEVERIFIEERD"),
      `een mislukte verificatie schrijft niets: ${na.join(",")}`,
    );
    void slug;
  });

  /* ================================================================
     3 — beide beleidsschakelaars moeten aan
     ================================================================ */

  test("3 · met auto_uitgifte_aan uit is de wachtrij leeg, met een reden", async () => {
    await zetBeleid({ autoAan: true, uitgifteAan: false });
    const uit = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.equal(uit.opdrachten.length, 0);
    assert.ok(
      uit.stop.some((s) => s.sleutel === "beleid_uit"),
      `er hoort een stopreden 'beleid_uit' te zijn, kreeg ${JSON.stringify(uit.stop)}`,
    );
    assert.match(uit.stop.map((s) => s.reden).join(" "), /auto_uitgifte_aan=false/);
  });

  test("3b · zonder actieve beleidsrij geeft dit platform niets uit", async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.publicatiebeleid set actief = false where organisatie_id = $1", [org]);
    });
    const uit = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.equal(uit.opdrachten.length, 0);
    assert.ok(uit.stop.some((s) => s.sleutel === "geen_beleid"));
  });

  test("3c · de DATABASE weigert uitgifte zonder automatische goedkeuring", async () => {
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.publicatiebeleid
               (organisatie_id, versie, auto_publiceren_aan, auto_uitgifte_aan, actief)
             values ($1, 'onmogelijk', false, true, false)`,
            [org],
          );
        }),
      /publicatiebeleid_uitgifte_vereist_autogoedkeuring/,
      "uitgifte zonder autogoedkeuring hoort op de CHECK uit 0058 te stuklopen",
    );
  });

  /* ================================================================
     4 en 5 — wie er NIET in de rij komt
     ================================================================ */

  test("4 · hoog risico komt niet in de uitgifterij, ook niet na handmatig zetten", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    /* Eerst langs de normale weg goedgekeurd krijgen (laag risico), en
       DAARNA het statusveld met de hand op hoog zetten — precies de
       manipulatie die §8 afgesloten wil hebben. */
    process.env["INTEL_SITE_WORTEL"] = site;
    configVergeten();
    await automatischPubliceren(db.pool, org, {});
    delete process.env["INTEL_SITE_WORTEL"];
    configVergeten();

    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query("update intel.inhoud_versies set risico_klasse = 'hoog' where id = $1", [
            versieId,
          ]);
        }),
      /inhoud_versies_beleid_nooit_hoog_risico/,
      "de database hoort een beleidsgoedkeuring bij hoog risico te weigeren",
    );

    const uit = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.ok(
      !uit.opdrachten.some((o) => o.risicoKlasse === "hoog"),
      "er hoort geen hoogrisico-opdracht te bestaan",
    );
    void beleid;
  });

  test("5 · een MENSELIJK goedgekeurd artikel blijft buiten de autonome rij", async () => {
    await zetBeleid();
    const { versieId } = await maakVersie();
    const goed = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, versieId, chef, "met de hand akkoord"),
    );
    assert.ok(goed.goedgekeurd, goed.goedgekeurd ? "" : goed.reden);

    const uit = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.ok(
      !uit.opdrachten.some((o) => o.inhoudVersieId === versieId),
      "de menselijke weg loopt via de CLI met een mens die de PR opent; een machine hoort die " +
        "niet over te nemen",
    );
  });

  /* ================================================================
     6 — een andere hash dan de server bouwde
     ================================================================ */

  test("6 · een ANDERE recordhash legt niets vast", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    process.env["INTEL_SITE_WORTEL"] = site;
    configVergeten();
    await automatischPubliceren(db.pool, org, {});
    delete process.env["INTEL_SITE_WORTEL"];
    configVergeten();

    const voor = await fasen(versieId);
    const uit = await aanvaardRecord(
      db.pool,
      org,
      versieId,
      {
        recordHash: "0".repeat(64),
        waar: "een verzonnen melding",
        beleidVersie: beleid,
      },
      { intelligenceWortel: intelWortel },
    ).catch((e: unknown) => ({ ok: false, reden: (e as Error).message, publicatieId: null }));

    assert.equal(uit.ok, false, "een onbekende hash hoort geweigerd te worden");
    const na = await fasen(versieId);
    assert.deepEqual(na, voor, "en er hoort geen enkele regel bij te komen");
  });

  /* ================================================================
     7 en 8 — de toestandsmachine
     ================================================================ */

  test("7 · PR_GEMERGED kan niet volgen op GEEN FASE", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    await assert.rejects(
      () =>
        aanvaardMerge(db.pool, org, versieId, {
          mergeCommit: "a".repeat(40),
          checksGroen: ["Release 1", "Release 2", "Beveiliging"],
          beleidVersie: beleid,
        }),
      /kan niet volgen op/,
    );
  });

  test("7b · een merge zonder gemelde groene checks wordt niet vastgelegd", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    await assert.rejects(
      () =>
        aanvaardMerge(db.pool, org, versieId, {
          mergeCommit: "a".repeat(40),
          checksGroen: [],
          beleidVersie: beleid,
        }),
      /groene checks|kan niet volgen/,
    );
  });

  test("7c · een melding zonder commit-sha wordt geweigerd", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    await assert.rejects(
      () =>
        aanvaardPr(db.pool, org, versieId, {
          branch: "publicatie/iets",
          commit: "geen-sha",
          prNummer: 1,
          prUrl: null,
          beleidVersie: beleid,
        }),
      /geen commit-sha|kan niet volgen/,
    );
  });

  /* ================================================================
     2 — het dagplafond en de stroomonderbreker
     ================================================================ */

  test("2 · de stroomonderbreker zet de uitgifte stil na drie mislukkingen", async () => {
    const beleid = await zetBeleid();
    const { versieId } = await maakVersie();
    for (let i = 0; i < MAX_OPEENVOLGENDE_FOUTEN; i += 1) {
      await meldUitgifteFout(db.pool, org, versieId, {
        stap: `proef-${i}`,
        fout: "de generator gaf exit 1",
        beleidVersie: beleid,
      });
    }
    const { stop } = await stopredenen(db.pool, org, { intelligenceWortel: intelWortel });
    assert.ok(
      stop.some((s) => s.sleutel === "stroomonderbreker"),
      `drie fouten op rij horen de uitgifte stil te zetten, kreeg ${JSON.stringify(stop)}`,
    );
    const uit = await maakUitgifteWachtrij(db.pool, org, { intelligenceWortel: intelWortel });
    assert.equal(uit.opdrachten.length, 0, "en dan is de wachtrij leeg");
  });

  test("10 · een BIJNA identiek artikel wordt door de generator tegengehouden", async () => {
    /* WAT HIER WORDT BEWEZEN. §1 van de opdracht eist dat het platform
       geen dubbele of vrijwel identieke artikelen publiceert.
       Voorwaarde 8 van de autopublicatie dekt het EXACTE duplicaat (de
       inhoudsafdruk), maar twee artikelen die 95% overlappen hebben
       verschillende afdrukken en komen daar dus langs.

       De bestaande SEO-poorten van Release 1 vangen juist dat: poort 11
       meet duplicaatinhoud met een jaccard-index, poort 12 meet
       kannibalisatie op gelijke titels en koppen. Deze zaak legt vast
       dat die bescherming OOK op de autonome weg geldt — en dat de
       mislukking wordt vastgelegd in plaats van stil overgeslagen.

       Gemeten toen de fixtures nog te veel op elkaar leken:
         ### 11 Duplicaat-inhoud — FAIL: jaccard 0.93, overlap 97%
         ### 12 Kannibalisatie — FAIL: dezelfde <title> en H1 */
    /* EEN EIGEN ORGANISATIE VOOR DEZE ZAAK.
       Het dagplafond en de stroomonderbreker zijn PER ORGANISATIE en
       tellen over de hele suite door: de eerdere zaken hebben er al
       drie gepubliceerd en drie fouten gemeld, en dan is de wachtrij
       terecht leeg. Beide beschermingen worden in zaak 2 en 2b apart
       bewezen; hier zouden ze de meting in de weg staan. */
    const kopie = await maakSiteKopie("dup");
    const dupOrg = await maakOrganisatie(db, "uitgifte-dup-org");
    const dupAuteur = await maakGebruiker(db, dupOrg, "dup@test.nl", "analist");
    const beleid = await zetBeleid({ org: dupOrg });

    const eerste = await maakVersie({ org: dupOrg, auteur: dupAuteur });
    const tweede = await maakVersie({ org: dupOrg, auteur: dupAuteur });
    /* De tweede krijgt LETTERLIJK de tekst van de eerste, op een ander
       pad. Verschillende afdruk (het pad zit er niet in... maar de
       tekst wel, dus ook dezelfde afdruk) — daarom eerst publiceren we
       de eerste niet, en meten we alleen de generator. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(dupOrg)]);
      const r = await c.query<{ titel: string; direct_antwoord: string; body_markdown: string }>(
        "select titel, direct_antwoord, body_markdown from intel.inhoud_versies where id = $1",
        [eerste.versieId],
      );
      const bron = r.rows[0]!;
      /* ÉÉN WOORD VERSCHIL. Genoeg voor een andere inhoudsafdruk, dus
         voorwaarde 8 laat hem door — en veel te weinig voor poort 11. */
      const body = `${bron.body_markdown}\nEen laatste opmerking bij dit bericht.\n`;
      const afdruk = inhoudAfdruk({
        titel: bron.titel,
        directAntwoord: bron.direct_antwoord,
        bodyMarkdown: body,
        structuredData: { "@context": "https://schema.org", "@type": "Article" },
      });
      await c.query(
        `update intel.inhoud_versies
            set titel = $2, direct_antwoord = $3, body_markdown = $4, inhoud_afdruk = $5
          where id = $1`,
        [tweede.versieId, bron.titel, bron.direct_antwoord, body, afdruk],
      );
    });

    await automatischPubliceren(db.pool, dupOrg, {});
    const rij = await maakUitgifteWachtrij(db.pool, dupOrg, {
      intelligenceWortel: join(kopie.site, "intelligence"),
    });
    const o1 = rij.opdrachten.find((o) => o.inhoudVersieId === eerste.versieId);
    const o2 = rij.opdrachten.find((o) => o.inhoudVersieId === tweede.versieId);
    assert.ok(o1 !== undefined && o2 !== undefined, JSON.stringify(rij));

    /* De eerste bouwt gewoon, EN WORDT GEMERGED. Zonder die merge staat
       hij alleen op zijn eigen branch en ziet de tweede build hem niet
       — dan meet deze zaak niets. Dat is precies de orde van de echte
       keten: het eerste artikel staat publiek voordat het tweede wordt
       aangeboden. */
    await uitvoerderDoetZijnWerk(o1, { site: kopie.site });
    await uitvoerderMergt(o1.branch, kopie.site);

    /* De tweede komt er bovenop en breekt de generatorketen. */
    let generatorFout = "";
    await uitvoerderDoetZijnWerk(o2, { site: kopie.site }).catch((e: unknown) => {
      generatorFout = (e as Error).message;
    });
    assert.match(
      generatorFout,
      /Duplicaat-inhoud|Kannibalisatie/,
      `de generator hoort het bijna-duplicaat te weigeren, kreeg: ${generatorFout.slice(0, 400)}`,
    );

    /* EN DE MISLUKKING WORDT VASTGELEGD. Dat is wat de uitvoerder in
       productie doet: hij meldt de stap waarop hij strandde, en die
       regels voeden de stroomonderbreker. */
    await meldUitgifteFout(db.pool, dupOrg, tweede.versieId, {
      stap: "generator",
      fout: generatorFout.slice(0, 300),
      beleidVersie: beleid,
    });
    const na = await fasen(tweede.versieId, dupOrg);
    assert.ok(na.includes("GEBLOKKEERD"), `de fout hoort in het logboek te staan: ${na.join(",")}`);
  });

  test("11 · een bron met een storing levert geen opdracht", async () => {
    /* §1: publiceer geen artikel wanneer de onderliggende bron
       onvoldoende betrouwbaar of actueel is. De nieuwsselectie leest de
       brongezondheid niet (gemeten), dus de uitgifte doet het — en
       alleen daar, want voor een concept dat een mens beoordeelt is een
       zieke bron zichtbaar. */
    const storingOrg = await maakOrganisatie(db, "uitgifte-storing-org");
    const storingAuteur = await maakGebruiker(db, storingOrg, "storing@test.nl", "analist");
    await zetBeleid({ org: storingOrg });
    const { versieId } = await maakVersie({ org: storingOrg, auteur: storingAuteur });
    await automatischPubliceren(db.pool, storingOrg, {});

    /* Eerst meten dat hij ER WEL IN STAAT; anders bewijst de weigering
       hieronder niets. */
    const voor = await maakUitgifteWachtrij(db.pool, storingOrg, {
      intelligenceWortel: intelWortel,
    });
    assert.ok(
      voor.opdrachten.some((o) => o.inhoudVersieId === versieId),
      `zonder storing hoort hij in de rij te staan: ${JSON.stringify(voor)}`,
    );

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(storingOrg)]);
      await c.query(
        `update intel.bronnen
            set gezondheid = 'BROKEN', storingssoort = 'TIJDELIJKE_STORING',
                storing_sinds = now() - interval '2 hours'
          where organisatie_id = $1`,
        [storingOrg],
      );
    });

    const na = await maakUitgifteWachtrij(db.pool, storingOrg, { intelligenceWortel: intelWortel });
    assert.ok(
      !na.opdrachten.some((o) => o.inhoudVersieId === versieId),
      "met een storing hoort er geen opdracht te zijn",
    );
    const weigering = na.geweigerd.find((g) => g.inhoudVersieId === versieId);
    assert.ok(weigering !== undefined, JSON.stringify(na.geweigerd));
    assert.match(weigering.reden, /storing/);
    assert.match(weigering.reden, /BROKEN|TIJDELIJKE_STORING/);
  });

  test("12 · een risicoklasse zonder gezaaid cluster is geen grond", async () => {
    /* pijplijn/clusteren.ts doet `cluster?.risico_klasse ?? "laag"`:
       een onbekend cluster komt als LAAG uit de pijplijn. Fail-open, en
       dus geen grond voor een publicatie zonder mens. */
    const losOrg = await maakOrganisatie(db, "uitgifte-los-org");
    const losAuteur = await maakGebruiker(db, losOrg, "los@test.nl", "analist");
    await zetBeleid({ org: losOrg });
    const { versieId } = await maakVersie({ org: losOrg, auteur: losAuteur });
    await automatischPubliceren(db.pool, losOrg, {});

    /* De kandidaat raakt zijn cluster kwijt — precies de toestand die
       een gebeurtenis zonder herkend onderwerp oplevert. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(losOrg)]);
      await c.query(
        `update intel.inhoud_kandidaten
            set onderwerp_cluster_id = null
          where id = (select kandidaat_id from intel.inhoud_versies where id = $1)`,
        [versieId],
      );
    });

    const rij = await maakUitgifteWachtrij(db.pool, losOrg, { intelligenceWortel: intelWortel });
    assert.ok(
      !rij.opdrachten.some((o) => o.inhoudVersieId === versieId),
      "zonder gezaaid cluster hoort er geen opdracht te zijn",
    );
    const weigering = rij.geweigerd.find((g) => g.inhoudVersieId === versieId);
    assert.ok(weigering !== undefined, JSON.stringify(rij.geweigerd));
    assert.match(weigering.reden, /onderwerpcluster/);
  });

  test("13 · een plaatshouder voor de redactie blokkeert de uitgifte", async () => {
    const plOrg = await maakOrganisatie(db, "uitgifte-plaatshouder-org");
    const plAuteur = await maakGebruiker(db, plOrg, "pl@test.nl", "analist");
    await zetBeleid({ org: plOrg });
    const { versieId } = await maakVersie({ org: plOrg, auteur: plAuteur });
    await automatischPubliceren(db.pool, plOrg, {});

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(plOrg)]);
      /* De plaatshouder zoals bouwConcept() hem schrijft. De afdruk
         schuift mee, want anders botst de goedkeuringsbinding — en de
         goedkeuring is hier al gegeven, dus die binding moet kloppen. */
      await c.query(
        `update intel.inhoud_versies
            set body_markdown = body_markdown || E'\n**TE VERWOORDEN DOOR DE REDACTIE.** Dit bericht rust op een kwalitatief feit.\n'
          where id = $1`,
        [versieId],
      );
    });

    const rij = await maakUitgifteWachtrij(db.pool, plOrg, { intelligenceWortel: intelWortel });
    assert.ok(!rij.opdrachten.some((o) => o.inhoudVersieId === versieId));
    const weigering = rij.geweigerd.find((g) => g.inhoudVersieId === versieId);
    assert.ok(weigering !== undefined, JSON.stringify(rij.geweigerd));
    assert.match(weigering.reden, /plaatshouder/);
  });

  test("14 · een kop die als documentkenmerk leest blokkeert de uitgifte", async () => {
    const kopOrg = await maakOrganisatie(db, "uitgifte-kop-org");
    const kopAuteur = await maakGebruiker(db, kopOrg, "kop@test.nl", "analist");
    await zetBeleid({ org: kopOrg });
    const { versieId } = await maakVersie({ org: kopOrg, auteur: kopAuteur });
    await automatischPubliceren(db.pool, kopOrg, {});

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(kopOrg)]);
      /* Precies de vorm die de conceptbouw oplevert bij een
         ACM-besluit: het dossierkenmerk als kop. */
      await c.query("update intel.inhoud_versies set titel = $2 where id = $1", [
        versieId,
        "ACM/UIT/1123013 | Vibe Energy",
      ]);
    });

    const rij = await maakUitgifteWachtrij(db.pool, kopOrg, { intelligenceWortel: intelWortel });
    assert.ok(!rij.opdrachten.some((o) => o.inhoudVersieId === versieId));
    const weigering = rij.geweigerd.find((g) => g.inhoudVersieId === versieId);
    assert.ok(weigering !== undefined, JSON.stringify(rij.geweigerd));
    assert.match(weigering.reden, /documentkenmerk|nieuwskop/);
  });

  test("15 · een gestrande keten kan worden HERVAT, en een menselijke niet overgenomen", async () => {
    /* WAT HIER WORDT GEDICHT. publiceer() zet de status op
       'gepubliceerd' zodra het registerrecord bestaat — fase 2 van de
       vijf. Strandt de uitgifte daarna op de pull request, dan staat de
       versie op 'gepubliceerd' terwijl er publiek nog niets is. Met een
       wachtrij die alleen 'goedgekeurd' leest viel hij er dan uit en kon
       de keten NOOIT worden hervat. Gemeten in mijn eigen eerste versie
       van deze laag.

       En de keerzijde: een versie die door de OUDE weg is gepubliceerd
       (auto_uitgifte_aan uit, een mens opent de PR) mag een wachtrij
       niet overnemen. Het verschil staat in de grond van het besluit. */
    const hervatOrg = await maakOrganisatie(db, "uitgifte-hervat-org");
    const hervatAuteur = await maakGebruiker(db, hervatOrg, "hervat@test.nl", "analist");
    const beleid = await zetBeleid({ org: hervatOrg });
    const { versieId } = await maakVersie({ org: hervatOrg, auteur: hervatAuteur });
    await automatischPubliceren(db.pool, hervatOrg, {});

    const rij = await maakUitgifteWachtrij(db.pool, hervatOrg, { intelligenceWortel: intelWortel });
    const opdracht = rij.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(opdracht !== undefined, JSON.stringify(rij));

    /* Fase 2 lukt, en daarna strandt de uitvoerder. */
    const { commit } = await uitvoerderDoetZijnWerk(opdracht, { bouw: false });
    const record = await aanvaardRecord(
      db.pool,
      hervatOrg,
      versieId,
      { recordHash: opdracht.recordHash, waar: "hervatproef", beleidVersie: beleid },
      { intelligenceWortel: intelWortel },
    );
    assert.ok(record.ok, record.reden);
    await meldUitgifteFout(db.pool, hervatOrg, versieId, {
      stap: "pull request openen",
      fout: "GitHub gaf 502",
      beleidVersie: beleid,
    });

    /* EN DE VOLGENDE RONDE PAKT HEM WEER OP, op dezelfde branch. */
    const opnieuw = await maakUitgifteWachtrij(db.pool, hervatOrg, {
      intelligenceWortel: intelWortel,
    });
    const hervat = opnieuw.opdrachten.find((o) => o.inhoudVersieId === versieId);
    assert.ok(
      hervat !== undefined,
      `een gestrande keten hoort hervat te kunnen worden: ${JSON.stringify(opnieuw)}`,
    );
    assert.equal(hervat.branch, opdracht.branch, "dezelfde branch, want die is deterministisch");
    assert.equal(hervat.recordHash, opdracht.recordHash, "en hetzelfde record");

    /* De keten loopt daarna gewoon door. */
    const pr = await aanvaardPr(db.pool, hervatOrg, versieId, {
      branch: hervat.branch,
      commit,
      prNummer: 7,
      prUrl: null,
      beleidVersie: beleid,
    });
    assert.ok(pr.ok, pr.reden);

    /* ---- en nu de keerzijde: de OUDE weg wordt niet overgenomen ---- */
    const oudOrg = await maakOrganisatie(db, "uitgifte-oudeweg-org");
    const oudAuteur = await maakGebruiker(db, oudOrg, "oud@test.nl", "analist");
    /* auto_uitgifte_aan UIT: dan publiceert de ronde zelf het record,
       zoals de bestaande weg doet. */
    await zetBeleid({ org: oudOrg, uitgifteAan: false });
    const oud = await maakVersie({ org: oudOrg, auteur: oudAuteur });
    process.env["INTEL_SITE_WORTEL"] = site;
    configVergeten();
    const oudeRonde = await automatischPubliceren(db.pool, oudOrg, {});
    delete process.env["INTEL_SITE_WORTEL"];
    configVergeten();
    assert.equal(
      oudeRonde.gepubliceerd.length,
      1,
      `de oude weg hoort zelf te publiceren: ${JSON.stringify(oudeRonde.geweigerd)}`,
    );

    /* Zet uitgifte AAN en kijk of die publicatie wordt overgenomen. */
    await zetBeleid({ org: oudOrg, uitgifteAan: true });
    const naOmzetten = await maakUitgifteWachtrij(db.pool, oudOrg, {
      intelligenceWortel: intelWortel,
    });
    assert.ok(
      !naOmzetten.opdrachten.some((o) => o.inhoudVersieId === oud.versieId),
      "een publicatie van de oude weg hoort niet door de wachtrij te worden overgenomen",
    );
    const weigering = naOmzetten.geweigerd.find((g) => g.inhoudVersieId === oud.versieId);
    assert.ok(weigering !== undefined, JSON.stringify(naOmzetten.geweigerd));
    assert.match(weigering.reden, /wacht op een mens|niet door de uitgifte geschreven/);
  });

  test("2b · het dagplafond staat op een gemeten getal", () => {
    assert.ok(
      MAX_AUTONOME_PUBLICATIES_PER_DAG >= 1 && MAX_AUTONOME_PUBLICATIES_PER_DAG <= 10,
      "een plafond buiten dit bereik is geen redactionele keuze meer",
    );
  });
});
