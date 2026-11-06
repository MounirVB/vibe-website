/* ============================================================
   TEST — van goedkeuring tot pull request, in één keten
   ------------------------------------------------------------
   WAT DEZE SUITE BEWIJST, EN WAAROM HIJ ER NIET AL WAS

   De goedkeuring en de publicatie waren elk apart getoetst, maar de NAAD
   ertussen niet. Daar zat het defect: keurGoed() zette de status op
   'goedgekeurd' en liet `poorten_geslaagd` staan waar hij stond. Poort 9
   (`hoog_risico_vereist_mens`) kan alleen opengaan DOOR een goedkeuring,
   en de enige twee aanroepers van de hertoets weigerden een versie op
   'goedgekeurd'. Een goedgekeurd hoogrisicoartikel was dus per
   constructie onpubliceerbaar, en publiceer() weigerde het op een
   blokkade die niemand meer kon opheffen.

   De tien zaken uit de opdracht, met hun testnummer:

     hoogrisicoartikel goedkeuren          1, 2
     artikel afwijzen                      5, 6
     concept wijzigen                      9, 10
     onvoldoende bronbewijs                3, 4
     herberekening van poorten             2, 7
     dubbele goedkeuring                   8
     dubbele publicatieaanvraag            13
     mislukte PR-aanmaak                   14
     herstel na een gedeeltelijke fout     14, 16
     correcte publieke URL na uitrol       12

   WAT ER NIET GEBEURT. Geen netwerk (INTEL_NETWERK_TOEGESTAAN=0), geen
   productiedatabase, geen productierepository: elke zaak draait op een
   eigen wegwerpdatabase en, waar git nodig is, op een eigen sitewortel
   met een eigen bare remote in een tijdelijke map. `gh` wordt nooit echt
   aangeroepen — er staat een nagemaakte `gh` vóór in PATH, zodat de
   faalpaden EN het hergebruik van een bestaande PR te toetsen zijn
   zonder iets op GitHub te raken.
   ============================================================ */

import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  actorVan,
  alsEigenaar,
  maakDragendeVersie,
  maakGebruiker,
  maakOrganisatie,
  maakWegwerpdatabase,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import type { Actor } from "../../src/inhoud/actor.ts";
import { hertoetsInhoudVersie, REDACTIONELE_BLOKKADE } from "../../src/inhoud/concept.ts";
import { draaiTerug, keurGoed, publiceer } from "../../src/inhoud/publiceer.ts";
import { branchVoor, maakGit, maakPublicatiePr } from "../../src/publicatie/pr.ts";
import { maakApp } from "../../src/dashboard/server.ts";
import { maakSessieCookie } from "../../src/dashboard/auth.ts";
import { CSRF_KOEKJE, CSRF_VELD, maakCsrfToken } from "../../src/dashboard/bescherming.ts";

const uitvoeren = promisify(execFile);
const GEHEIM = "p".repeat(40);
const CLUSTER = "netcongestie";
const EIGENAAR_ROUTE = "kennis/netcongestie-uitgelegd";

/**
 * Een inhoudsversie die ALLE poorten haalt zodra er een mens bij is.
 *
 * `publiceerbaar: true` in de harnas vult de twee poorten aan die niets
 * met claims te maken hebben (een commerciele pagina in het register en
 * een bronnensectie); zie de toelichting daar. Deze helper legt daar het
 * CLUSTER en de KANDIDAAT bovenop, want publiceerViaRegister() weigert
 * zonder onderwerp-eigenaar, en die komt uit het cluster van de
 * kandidaat — geen enkele andere toets heeft dat nodig.
 */
async function maakPubliceerbaar(
  db: Wegwerpdatabase,
  org: number,
  opties: { slug: string; risico?: "laag" | "midden" | "hoog"; aangemaaktDoor: number },
): Promise<{ versieId: number; uitspraakId: number; afdruk: string; body: string }> {
  const v = await maakDragendeVersie(db, org, {
    slug: opties.slug,
    risico: opties.risico ?? "hoog",
    aangemaaktDoor: opties.aangemaaktDoor,
    publiceerbaar: true,
  });

  /* HET CLUSTER EN DE KANDIDAAT STAAN NU IN HET HARNAS.
     Deze helper maakte ze eerst zelf, en toen de harnas dat overnam
     botsten de twee op markt_gebeurtenissen_sleutel_uniek — beide
     gebruikten dezelfde sleutel. Eén plek die het doet, en dat is
     `publiceerbaar: true`; zie de toelichting daar. */
  const body = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
    const r = await c.query<{ body_markdown: string }>(
      "select body_markdown from intel.inhoud_versies where id = $1",
      [v.versieId],
    );
    return r.rows[0]!.body_markdown;
  });

  return { versieId: v.versieId, uitspraakId: v.uitspraakId, afdruk: v.afdruk, body };
}

/** De reden plus de hele grendeltabel, voor een leesbare faalregel. */
function verslag(uit: {
  reden: string;
  grendels: readonly { naam: string; ok: boolean; meting: string }[];
}): string {
  const regels = uit.grendels.map((g) => `  ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}`);
  return [uit.reden, ...regels].join("\n");
}

/** De stand van één versie, zoals publiceer() hem leest. */
async function stand(
  db: Wegwerpdatabase,
  org: number,
  versieId: number,
): Promise<{
  status: string;
  poorten: boolean;
  blokkades: string[];
  goedgekeurd_door: number | null;
  goedgekeurde_afdruk: string | null;
  inhoud_afdruk: string | null;
}> {
  return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
    const r = await c.query<{
      status: string;
      poorten: boolean;
      blokkades: string[];
      goedgekeurd_door: number | null;
      goedgekeurde_afdruk: string | null;
      inhoud_afdruk: string | null;
    }>(
      `select status, poorten_geslaagd as poorten, blokkades, goedgekeurd_door,
              goedgekeurde_afdruk, inhoud_afdruk
         from intel.inhoud_versies where id = $1`,
      [versieId],
    );
    return r.rows[0]!;
  });
}

async function besluiten(
  db: Wegwerpdatabase,
  org: number,
  versieId: number,
): Promise<{ besluit: string; motivatie: string | null }[]> {
  return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
    const r = await c.query<{ besluit: string; motivatie: string | null }>(
      `select besluit, motivatie from intel.publicatiebesluiten
        where inhoud_versie_id = $1 order by id`,
      [versieId],
    );
    return r.rows;
  });
}

/* ================================================================
   DEEL 1 — de goedkeuringsflow
   ================================================================ */

describe("de goedkeuring herberekent de poorten die zij zelf opent", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let redacteur = 0;
  /* De GEVERIFIEERDE actor voor publiceer(); zie actorVan() in het harnas. */
  let actor: Actor;

  before(async () => {
    db = await maakWegwerpdatabase("keten1");
    org = await maakOrganisatie(db, "vibe-energy");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    redacteur = await maakGebruiker(db, org, "redactie@test.nl", "redacteur");
    actor = await actorVan(db, org, chef);
  });

  after(async () => {
    await db.opruimen();
  });

  test("1 · een hoogrisicoartikel staat vóór de goedkeuring op precies één blokkade", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-1", aangemaaktDoor: auteur });
    const h = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );
    assert.ok(h !== null);
    assert.equal(h.poortenGeslaagd, false, "zonder mens hoort de poort dicht te staan");
    assert.deepEqual(
      h.blokkades.map((b) => b.split(":")[0]),
      ["hoog_risico_vereist_mens"],
      `alleen de menspoort hoort te blokkeren: ${h.blokkades.join(" | ")}`,
    );
  });

  test("2 · na de goedkeuring zijn de poorten open en is de blokkade weg", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-2", aangemaaktDoor: auteur });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "ik heb de bron gelezen"),
    );
    assert.ok(uitslag.goedgekeurd, "de goedkeuring hoort te slagen");
    assert.ok(uitslag.naHertoets !== null, "de uitslag hoort de poortstand te dragen");
    assert.equal(uitslag.naHertoets.poortenGeslaagd, true, uitslag.naHertoets.blokkades.join(" | "));

    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "goedgekeurd");
    assert.equal(na.poorten, true, `poorten_geslaagd hoort true te zijn: ${na.blokkades.join(" | ")}`);
    assert.deepEqual(na.blokkades, [], "er hoort geen blokkade meer te staan");
    assert.equal(na.goedgekeurd_door, chef);
    /* DE AFDRUKBINDING OVERLEEFT DE HERTOETS. De hertoets herberekent
       `inhoud_afdruk`; wijkt die af van `goedgekeurde_afdruk`, dan
       weigert publiceer() en is de goedkeuring waardeloos. */
    assert.equal(na.goedgekeurde_afdruk, na.inhoud_afdruk);

    /* EN DE POORTSTAND STAAT IN HET ONWISBARE SPOOR. */
    const spoor = await besluiten(db, org, v.versieId);
    assert.ok(
      spoor.some((b) => b.besluit === "goedgekeurd"),
      `er hoort een goedkeuringsbesluit te staan: ${JSON.stringify(spoor)}`,
    );
  });

  test("3 · onvoldoende bronbewijs blokkeert de goedkeuring en zet geen status", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-3", aangemaaktDoor: auteur });
    /* De claim verliest zijn bevestiging: dat is een inhoudelijke
       bronfout en geen formaliteit. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.uitspraken set verificatie_status = 'ingetrokken' where id = $1", [
        v.uitspraakId,
      ]);
    });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "toch maar goedkeuren"),
    );
    assert.equal(uitslag.goedgekeurd, false, "zonder dragend bewijs mag niets door");
    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "ter_review", "een geblokkeerde goedkeuring mag de status niet zetten");
    assert.equal(na.goedgekeurd_door, null);
    const spoor = await besluiten(db, org, v.versieId);
    assert.ok(
      spoor.some((b) => b.besluit === "automatisch_geblokkeerd"),
      "de blokkade hoort in het publicatiespoor te staan",
    );
  });

  test("4 · een menselijke goedkeuring opent de menspoort en NIETS anders", async () => {
    /* Hier wordt de eis getoetst dat een inhoudelijke bronfout nooit
       door een goedkeuring verdwijnt. De bronnensectie wordt geleegd —
       een echte redactionele tekortkoming — en de goedkeuring slaagt
       (het BEWIJS draagt immers nog), maar de poort blijft dicht. */
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-4", aangemaaktDoor: auteur });
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.inhoud_versies set bronnen_sectie = '[]'::jsonb where id = $1", [
        v.versieId,
      ]);
    });

    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "goedgekeurd ondanks de ontbrekende bronregel"),
    );
    assert.ok(uitslag.goedgekeurd);
    assert.equal(uitslag.naHertoets?.poortenGeslaagd, false);
    assert.ok(
      uitslag.naHertoets!.blokkades.some((b) => b.startsWith("bronvermelding")),
      `de bronpoort hoort nog te blokkeren: ${uitslag.naHertoets!.blokkades.join(" | ")}`,
    );
    assert.ok(
      !uitslag.naHertoets!.blokkades.some((b) => b.startsWith("hoog_risico_vereist_mens")),
      "de menspoort hoort juist WEL open te zijn",
    );

    /* EN DAN WEIGERT PUBLICEREN, met die reden. Een goedkeuring is geen
       vrijbrief. */
    const r = await publiceer(db.pool, org, v.versieId, { actor });
    assert.equal(r.geschreven, false);
    assert.match(r.reden, /poorten niet geslaagd/);
  });

  test("5 · afwijzen bewaart de reden, ook na een hertoets", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-5", aangemaaktDoor: auteur });
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status = 'afgewezen',
                blokkades = array_append(coalesce(blokkades, array[]::text[]), $2)
          where id = $1`,
        [v.versieId, `${REDACTIONELE_BLOKKADE} de bron dekt de kop niet`],
      );
    });

    const h = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );
    assert.ok(h !== null);
    assert.ok(
      h.blokkades.some((b) => b.startsWith(REDACTIONELE_BLOKKADE)),
      `de afwijsreden hoort de hertoets te overleven: ${h.blokkades.join(" | ")}`,
    );
    assert.equal(h.poortenGeslaagd, false, "een afgewezen stuk is geen publiceerbaar stuk");
    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "afgewezen", "de hertoets mag de status niet veranderen");
  });

  test("6 · een afgewezen artikel is niet te publiceren", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-6", aangemaaktDoor: auteur });
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `update intel.inhoud_versies
            set status = 'afgewezen', blokkades = array['${REDACTIONELE_BLOKKADE} niet publiceren']
          where id = $1`,
        [v.versieId],
      );
    });
    const r = await publiceer(db.pool, org, v.versieId, { actor });
    assert.equal(r.geschreven, false);
    assert.match(r.reden, /poorten niet geslaagd|alleen 'goedgekeurd'/);
  });

  test("7 · een claim die ná de goedkeuring omvalt sluit de poort weer", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-7", aangemaaktDoor: auteur });
    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "gelezen en akkoord"),
    );
    assert.ok(uitslag.goedgekeurd, "de fixture hoort goedgekeurd te raken");
    assert.equal(uitslag.naHertoets?.poortenGeslaagd, true);

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query("update intel.uitspraken set modaliteit = 'VOORSTEL' where id = $1", [
        v.uitspraakId,
      ]);
    });

    /* De nooduitgang: hertoetsen zonder iets te wijzigen. Dit kon niet
       vóór deze ronde — en zonder deze weg zou een goedgekeurd artikel
       met een omgevallen claim stil publiceerbaar blijven. */
    const h = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );
    assert.equal(h?.poortenGeslaagd, false, "een voorstel als kernclaim mag niet door");
    const r = await publiceer(db.pool, org, v.versieId, { actor });
    assert.equal(r.geschreven, false, "en publiceren hoort dan te weigeren");
  });

  test("8 · een tweede goedkeuring door dezelfde mens verandert niets wezenlijks", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-8", aangemaaktDoor: auteur });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "eerste keer"),
    );
    const eerste = await stand(db, org, v.versieId);

    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "tweede keer"),
    );
    assert.ok(tweede.goedgekeurd, "keurGoed() is idempotent; de ROUTE houdt de dubbele klik tegen");
    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "goedgekeurd");
    assert.equal(na.goedgekeurd_door, chef);
    assert.equal(na.goedgekeurde_afdruk, eerste.goedgekeurde_afdruk, "de binding mag niet schuiven");
    assert.equal(na.poorten, true);
  });

  test("9 · een redacteur zonder hoogrisicorecht mag een hoogrisicoartikel niet goedkeuren", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-9", aangemaaktDoor: auteur });
    await assert.rejects(
      () =>
        metOrganisatie(db.pool, { organisatieId: org }, (c) =>
          keurGoed(c, v.versieId, redacteur, "ik probeer het"),
        ),
      /hoogrisico/,
      "de rol redacteur heeft inhoud.hoogrisico.goedkeuren niet",
    );
    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "ter_review");
  });
});

/* ================================================================
   DEEL 2 — de Content Studio over HTTP
   ================================================================ */

describe("de Content Studio over HTTP", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let redacteur = 0;
  let server: Server;
  let basis = "";

  before(async () => {
    process.env["INTEL_SESSIE_GEHEIM"] = GEHEIM;
    process.env["INTEL_OMGEVING"] = "test";
    db = await maakWegwerpdatabase("keten2");
    org = await maakOrganisatie(db, "vibe-energy");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    redacteur = await maakGebruiker(db, org, "redactie@test.nl", "redacteur");
    const app = maakApp(db.pool);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", () => r()));
    basis = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await db.opruimen();
  });

  function sessie(gebruikerId: number): { koekjes: string; csrf: string } {
    const koekje = maakSessieCookie(gebruikerId, org, 1);
    const csrf = maakCsrfToken(GEHEIM);
    return { koekjes: `intel_sessie=${koekje}; ${CSRF_KOEKJE}=${csrf}`, csrf };
  }

  async function haal(pad: string, gebruikerId: number): Promise<{ status: number; body: string }> {
    const s = sessie(gebruikerId);
    const r = await fetch(`${basis}${pad}`, {
      redirect: "manual",
      headers: { cookie: s.koekjes },
    });
    return { status: r.status, body: await r.text() };
  }

  async function post(
    pad: string,
    gebruikerId: number,
    velden: Record<string, string>,
  ): Promise<{ status: number; body: string }> {
    const s = sessie(gebruikerId);
    const body = new URLSearchParams({ ...velden, [CSRF_VELD]: s.csrf });
    const r = await fetch(`${basis}${pad}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: s.koekjes, "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { status: r.status, body: await r.text() };
  }

  test("10 · de lijst linkt naar het concept en de detailpagina draagt alles wat een besluit vraagt", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-10", aangemaaktDoor: auteur });
    await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      hertoetsInhoudVersie(c, org, v.versieId),
    );

    const lijst = await haal("/studio", chef);
    assert.equal(lijst.status, 200);
    assert.ok(
      lijst.body.includes(`href="/studio/${v.versieId}"`),
      "de lijst hoort naar de detailpagina te linken",
    );

    const detail = await haal(`/studio/${v.versieId}`, chef);
    assert.equal(detail.status, 200);
    /* De volledige tekst, opgemaakt EN ruw. */
    assert.ok(detail.body.includes("conceptweergave"), "de opgemaakte weergave hoort er te staan");
    assert.ok(detail.body.includes("Wat er is vastgelegd"), "de tekst zelf hoort er te staan");
    /* De bron op artikelniveau. */
    assert.ok(
      detail.body.includes("https://www.rvo.nl/subsidies-financiering/sde"),
      "de bronnensectie hoort gerenderd te worden",
    );
    /* De claim met zijn eigen zin, en de uitgever apart. */
    assert.ok(
      detail.body.includes("De aanvraagperiode voor de SDE++ 2026 loopt twee weken langer door."),
      "de claimtekst hoort in de ketentabel te staan",
    );
    assert.ok(detail.body.includes("uitgever:"), "de uitgever hoort apart zichtbaar te zijn");
    /* De publicatiestand en het besluitformulier. */
    assert.ok(detail.body.includes("Publicatiestand"), "de publicatiestand hoort erop te staan");
    assert.ok(detail.body.includes("Redactioneel besluit"), "de beheerder hoort een knop te zien");
    assert.ok(detail.body.includes("Dragende <strong>kern</strong>claims"));
  });

  test("11 · zonder hoogrisicorecht is er geen knop, maar wel een uitleg", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-11", aangemaaktDoor: auteur });
    const detail = await haal(`/studio/${v.versieId}`, redacteur);
    assert.equal(detail.status, 200);
    assert.ok(
      !detail.body.includes('value="GOEDGEKEURD"'),
      "een knop die altijd faalt mag er niet staan",
    );
    assert.ok(
      detail.body.includes("inhoud.hoogrisico.goedkeuren"),
      "de uitleg hoort het ontbrekende recht te noemen",
    );
  });

  test("12 · dubbele goedkeuring over HTTP: de tweede klik wordt geweigerd", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-12", aangemaaktDoor: auteur });
    const voor = await stand(db, org, v.versieId);

    const eerste = await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "GOEDGEKEURD",
      motivatie: "gelezen en akkoord",
      inhoud_afdruk: voor.inhoud_afdruk ?? "",
    });
    assert.equal(eerste.status, 303, eerste.body.slice(0, 300));

    /* De tweede klik draagt dezelfde afdruk, maar de status is nu
       'goedgekeurd' en dan hoort de route te weigeren. */
    const tweede = await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "GOEDGEKEURD",
      motivatie: "nog een keer",
      inhoud_afdruk: voor.inhoud_afdruk ?? "",
    });
    assert.equal(tweede.status, 400);
    assert.match(tweede.body, /niet meer te beoordelen/);

    const spoor = await besluiten(db, org, v.versieId);
    assert.equal(
      spoor.filter((b) => b.besluit === "goedgekeurd").length,
      1,
      `er hoort precies één goedkeuring te staan: ${JSON.stringify(spoor)}`,
    );
  });

  test("13 · een wijziging op een goedgekeurd concept laat de goedkeuring vervallen en hertoetst", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-13", aangemaaktDoor: auteur });
    const voor = await stand(db, org, v.versieId);
    const goedgekeurd = await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "GOEDGEKEURD",
      motivatie: "gelezen en akkoord",
      inhoud_afdruk: voor.inhoud_afdruk ?? "",
    });
    assert.equal(goedgekeurd.status, 303);
    const na1 = await stand(db, org, v.versieId);
    assert.equal(na1.status, "goedgekeurd");
    assert.equal(na1.poorten, true);

    /* Een REDACTEUR bewerkt (niet de goedkeurder), zodat vier ogen
       hierna nog kan werken. */
    const gewijzigd = await post(`/studio/${v.versieId}/tekst`, redacteur, {
      body_markdown: `${v.body}\n## Een toevoeging\n\nEen extra alinea van de redactie.\n`,
      inhoud_afdruk: na1.inhoud_afdruk ?? "",
    });
    assert.equal(gewijzigd.status, 303, gewijzigd.body.slice(0, 300));

    const na2 = await stand(db, org, v.versieId);
    assert.equal(na2.status, "ter_review", "de goedkeuring hoort te vervallen");
    assert.equal(na2.goedgekeurd_door, null);
    assert.equal(na2.goedgekeurde_afdruk, null);
    assert.notEqual(na2.inhoud_afdruk, na1.inhoud_afdruk, "de afdruk hoort mee te veranderen");
    assert.equal(na2.poorten, false, "zonder mens staat de menspoort weer dicht");
    assert.ok(na2.blokkades.some((b) => b.startsWith("hoog_risico_vereist_mens")));

    const spoor = await besluiten(db, org, v.versieId);
    assert.ok(
      spoor.some((b) => (b.motivatie ?? "").includes("goedkeuring vervallen")),
      `het vervallen hoort in het spoor te staan: ${JSON.stringify(spoor)}`,
    );

    /* EN HET IS HERSTELBAAR: opnieuw goedkeuren kan, door iemand die de
       tekst niet heeft bewerkt. */
    const opnieuw = await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "GOEDGEKEURD",
      motivatie: "ook de toevoeging gelezen",
      inhoud_afdruk: na2.inhoud_afdruk ?? "",
    });
    assert.equal(opnieuw.status, 303, opnieuw.body.slice(0, 300));
    const na3 = await stand(db, org, v.versieId);
    assert.equal(na3.status, "goedgekeurd");
    assert.equal(na3.poorten, true);
  });

  test("14 · dezelfde tekst opnieuw opslaan sloopt een geldige goedkeuring niet", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-14", aangemaaktDoor: auteur });
    const voor = await stand(db, org, v.versieId);
    await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "GOEDGEKEURD",
      motivatie: "gelezen en akkoord",
      inhoud_afdruk: voor.inhoud_afdruk ?? "",
    });
    const na1 = await stand(db, org, v.versieId);
    assert.equal(na1.status, "goedgekeurd");

    const zelfde = await post(`/studio/${v.versieId}/tekst`, redacteur, {
      body_markdown: v.body,
      inhoud_afdruk: na1.inhoud_afdruk ?? "",
    });
    assert.equal(zelfde.status, 303, zelfde.body.slice(0, 300));
    const na2 = await stand(db, org, v.versieId);
    assert.equal(na2.status, "goedgekeurd", "ongewijzigde tekst is geen inhoudelijke wijziging");
    assert.equal(na2.goedgekeurd_door, chef);
  });

  test("15 · afwijzen over HTTP zet de status en bewaart de reden", async () => {
    const v = await maakPubliceerbaar(db, org, { slug: "zaak-15", aangemaaktDoor: auteur });
    const voor = await stand(db, org, v.versieId);
    const uit = await post(`/studio/${v.versieId}/beoordeel`, chef, {
      besluit: "AFGEWEZEN",
      motivatie: "de kop belooft meer dan de bron zegt",
      inhoud_afdruk: voor.inhoud_afdruk ?? "",
    });
    assert.equal(uit.status, 303, uit.body.slice(0, 300));
    const na = await stand(db, org, v.versieId);
    assert.equal(na.status, "afgewezen");
    assert.ok(
      na.blokkades.some((b) => b.includes("de kop belooft meer dan de bron zegt")),
      `de reden hoort in de blokkades te staan: ${na.blokkades.join(" | ")}`,
    );
  });
});

/* ================================================================
   DEEL 3 — de publicatieketen tot de pull request
   ================================================================ */

describe("de publicatieketen tot de pull request", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let auteur = 0;
  let chef = 0;
  let werk = "";
  let site = "";
  let remote = "";
  let nepBin = "";
  let padVoor = "";
  /* De GEVERIFIEERDE actor voor de PR-keten; zie actorVan() in het harnas. */
  let actor: Actor;

  /** De generator die alleen gegenereerde paden aanraakt. */
  const GOEDE_GENERATOR = [
    "import { writeFileSync } from 'node:fs';",
    "import { dirname, resolve } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "const wortel = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');",
    "writeFileSync(resolve(wortel, 'sitemap.xml'), '<urlset><loc>x</loc></urlset>\\n');",
    "writeFileSync(resolve(wortel, 'nieuws.html'), '<html>hub</html>\\n');",
    "console.log('nepgenerator gedraaid');",
  ].join("\n");

  before(async () => {
    db = await maakWegwerpdatabase("keten3");
    org = await maakOrganisatie(db, "vibe-energy");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    actor = await actorVan(db, org, chef);

    werk = await mkdtemp(join(tmpdir(), "intel-keten-"));
    site = join(werk, "site");
    remote = join(werk, "remote.git");
    nepBin = join(werk, "bin");

    await uitvoeren("git", ["init", "--bare", "-b", "main", remote]);
    await mkdir(join(site, "data", "inhoud", "kennis"), { recursive: true });
    await mkdir(join(site, "data", "seo"), { recursive: true });
    await mkdir(join(site, "scripts", "seo"), { recursive: true });
    await mkdir(nepBin, { recursive: true });

    await writeFile(
      join(site, "data", "inhoud", "kennis", "netcongestie-uitgelegd.json"),
      JSON.stringify({ route: EIGENAAR_ROUTE, type: "kennis", titel: "Netcongestie uitgelegd" }),
      "utf8",
    );
    await writeFile(
      join(site, "data", "seo", "routes.json"),
      JSON.stringify({
        routes: [
          { route: EIGENAAR_ROUTE, soort: "nationaal", subsoort: "kennis", staat: "INDEX", reden: "f" },
          { route: "contact", soort: "nationaal", subsoort: "oplossing", staat: "INDEX", reden: "f" },
          { route: "regios/gelderland/arnhem", soort: "regio", subsoort: "gemeente", staat: "PENDING", reden: "f" },
        ],
      }),
      "utf8",
    );
    await writeFile(join(site, "scripts", "seo", "bouw.mjs"), GOEDE_GENERATOR, "utf8");

    const git = maakGit(site);
    await uitvoeren("git", ["init", "-b", "main", site]);
    await git(["remote", "add", "origin", remote]);
    await git(["add", "-A"]);
    await git(["-c", "user.name=toets", "-c", "user.email=t@t.nl", "commit", "-m", "basis"]);
    await git(["push", "-u", "origin", "main"]);

    padVoor = process.env["PATH"] ?? "";
  });

  after(async () => {
    process.env["PATH"] = padVoor;
    await rm(werk, { recursive: true, force: true });
    await db.opruimen();
  });

  /** Zet een nagemaakte `gh` vóór in PATH. */
  async function nepGh(gedrag: string): Promise<void> {
    const pad = join(nepBin, "gh");
    await writeFile(pad, `#!/bin/sh\n${gedrag}\n`, "utf8");
    await chmod(pad, 0o755);
    process.env["PATH"] = `${nepBin}:${padVoor}`;
  }

  function zonderNepGh(): void {
    process.env["PATH"] = padVoor;
  }

  /** Een goedgekeurde, volledig groene versie. */
  async function goedgekeurd(slug: string): Promise<number> {
    const v = await maakPubliceerbaar(db, org, { slug, aangemaaktDoor: auteur });
    const uitslag = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      keurGoed(c, v.versieId, chef, "gelezen en akkoord"),
    );
    assert.ok(uitslag.goedgekeurd, "de fixture hoort goedgekeurd te raken");
    assert.equal(
      uitslag.naHertoets?.poortenGeslaagd,
      true,
      `de fixture hoort groen te zijn: ${uitslag.naHertoets?.blokkades.join(" | ")}`,
    );
    return v.versieId;
  }

  async function werkboomSchoon(): Promise<void> {
    const status = (await maakGit(site)(["status", "--porcelain"])).trim();
    assert.equal(status, "", `de werkboom is niet schoon: ${status}`);
  }

  test("16 · de hele keten levert een commit en de juiste publieke URL op", async () => {
    const versieId = await goedgekeurd("uitrol-ok");
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, {
        siteWortel: site,
        pool: db.pool,
        basisBranch: "main",
        actor,
      }),
    );
    assert.ok(uit.geslaagd, `de keten hoort te slagen: ${verslag(uit)}`);
    assert.equal(uit.branch, branchVoor("uitrol-ok", versieId));
    assert.ok(uit.commit !== null, "er hoort een commit te staan");
    assert.equal(uit.prUrl, null, "zonder --open-pr gaat er geen PR open");

    /* HET RECORD, en de publieke URL die eruit volgt. */
    const relpad = join("data", "inhoud", "nieuws", "uitrol-ok.json");
    assert.ok(existsSync(join(site, relpad)), `${relpad} hoort geschreven te zijn`);
    const record = JSON.parse(await readFile(join(site, relpad), "utf8")) as Record<string, unknown>;
    assert.equal(record["route"], "nieuws/uitrol-ok");
    assert.equal(record["type"], "nieuws");
    /* 'GOEDGEKEURD' EN NIET 'GEPUBLICEERD', en dat is geen slordigheid.
       De generator van Release 1 zet een nieuwsroute alleen op INDEX bij
       exact deze waarde (scripts/seo/bouw-routes.mjs:426,
       scripts/seo/audit.mjs:857, data/inhoud/SCHEMA.md regel 91), en
       STAAT_UIT_STATUS beeldt zowel 'goedgekeurd' als 'gepubliceerd' op
       'GOEDGEKEURD' af. Een record met 'GEPUBLICEERD' zou door de audit
       van de website worden geweigerd. */
    assert.equal(record["redactionele_staat"], "GOEDGEKEURD");
    assert.equal(record["onderwerp_eigenaar"], EIGENAAR_ROUTE);
    assert.equal((record["_herkomst"] as { inhoud_versie_id: number }).inhoud_versie_id, versieId);
    assert.ok(Array.isArray(record["bronnen"]) && (record["bronnen"] as unknown[]).length > 0);

    const na = await stand(db, org, versieId);
    assert.equal(na.status, "gepubliceerd");
    /* De publieke URL is de canonieke URL van de versie, en die hoort
       exact de route te volgen. */
    const canoniek = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ canonieke_url: string }>(
        "select canonieke_url from intel.inhoud_versies where id = $1",
        [versieId],
      );
      return r.rows[0]!.canonieke_url;
    });
    assert.equal(canoniek, "https://www.vibeenergy.nl/nieuws/uitrol-ok");
    assert.equal(canoniek, `https://www.vibeenergy.nl/${String(record["route"])}`);

    /* De commit staat op de publicatiebranch en main is ongemoeid. */
    const git = maakGit(site);
    const huidige = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
    assert.equal(huidige, uit.branch);
    const bestanden = (await git(["show", "--name-only", "--format=", "HEAD"])).trim().split("\n");
    assert.ok(
      bestanden.includes("data/inhoud/nieuws/uitrol-ok.json"),
      `het geauteurde bestand hoort in de commit te zitten: ${bestanden.join(", ")}`,
    );
    const { stdout } = await uitvoeren("git", ["--git-dir", remote, "branch", "--list"]);
    assert.deepEqual(
      stdout.split("\n").map((r) => r.replace("*", "").trim()).filter(Boolean),
      ["main"],
      "zonder --open-pr wordt er niet gepusht",
    );

    await git(["checkout", "main"]);
    await werkboomSchoon();
  });

  test("17 · een tweede publicatieaanvraag voor dezelfde versie wordt geweigerd", async () => {
    const versieId = await goedgekeurd("uitrol-dubbel");
    const git = maakGit(site);
    const eerste = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main", actor }),
    );
    assert.ok(eerste.geslaagd, eerste.reden);
    await git(["checkout", "main"]);

    const tweede = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main", actor }),
    );
    assert.equal(tweede.geslaagd, false, "dezelfde versie mag niet twee keer publiceren");
    /* De tweede aanvraag strandt al op grendel 1: de status is na de
       eerste publicatie 'gepubliceerd' en niet meer 'goedgekeurd'. De
       reden hoort dat te ZEGGEN en niet te doen alsof er nooit is
       goedgekeurd. */
    assert.match(tweede.reden, /is al gepubliceerd/);
    assert.equal(tweede.commit, null, "er hoort geen tweede commit te zijn");

    /* ÉÉN publicatie in de boekhouding, niet twee. */
    const n = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ n: string }>(
        "select count(*)::text as n from intel.publicaties where inhoud_versie_id = $1",
        [versieId],
      );
      return Number(r.rows[0]!.n);
    });
    assert.equal(n, 1, "er hoort precies één publicatie geboekt te zijn");
    await git(["checkout", "main"]);
    await werkboomSchoon();
  });

  test("18 · een mislukte PR-aanmaak draait de publicatie terug en laat niets vuil achter", async () => {
    const versieId = await goedgekeurd("uitrol-prfout");
    await nepGh('echo "gh: kon geen verbinding maken" >&2; exit 1');
    try {
      const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        maakPublicatiePr(c, org, versieId, {
          siteWortel: site,
          pool: db.pool,
          basisBranch: "main",
          actor,
          openPr: true,
        }),
      );
      assert.equal(uit.geslaagd, false, "een mislukte PR is geen geslaagde publicatie");
      assert.match(uit.reden, /pull request kon niet worden geopend/);
      assert.equal(uit.prUrl, null);
      const grendel = uit.grendels.find((g) => g.naam === "pull request geopend");
      assert.equal(grendel?.ok, false, "de mislukking hoort als FAIL in de grendeltabel te staan");

      /* DE DATABASE VOLGT DE WERKELIJKHEID. */
      const na = await stand(db, org, versieId);
      assert.equal(na.status, "goedgekeurd", "niet 'gepubliceerd' en niet 'teruggedraaid'");
      assert.equal(na.goedgekeurd_door, chef, "de goedkeuring is niet ingetrokken");
      const pub = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
        const r = await c.query<{ status: string }>(
          "select status from intel.publicaties where inhoud_versie_id = $1 order by id desc limit 1",
          [versieId],
        );
        return r.rows[0]?.status ?? "geen";
      });
      assert.equal(pub, "teruggedraaid");

      /* EN DE WERKBOOM IS SCHOON, zonder de publicatiecommit. */
      await werkboomSchoon();
      const git = maakGit(site);
      const bestanden = (await git(["show", "--name-only", "--format=", "HEAD"])).trim();
      assert.ok(
        !bestanden.includes("uitrol-prfout"),
        `de publicatiecommit hoort weg te zijn: ${bestanden}`,
      );
      assert.ok(
        !existsSync(join(site, "data", "inhoud", "nieuws", "uitrol-prfout.json")),
        "het record hoort weg te zijn",
      );
    } finally {
      zonderNepGh();
    }

    /* HERSTELBAAR: dezelfde opdracht opnieuw, nu met een werkende gh. */
    await nepGh(
      'case "$1 $2" in\n' +
        '"pr list") echo "[]";;\n' +
        '"pr create") echo "https://github.com/vibe/vibe-website/pull/99";;\n' +
        "*) exit 0;;\nesac",
    );
    try {
      const opnieuw = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        maakPublicatiePr(c, org, versieId, {
          siteWortel: site,
          pool: db.pool,
          basisBranch: "main",
          actor,
          openPr: true,
        }),
      );
      assert.ok(opnieuw.geslaagd, `na herstel hoort het te lukken: ${opnieuw.reden}`);
      assert.equal(opnieuw.prUrl, "https://github.com/vibe/vibe-website/pull/99");
      const na = await stand(db, org, versieId);
      assert.equal(na.status, "gepubliceerd");
    } finally {
      zonderNepGh();
    }
    const git = maakGit(site);
    await git(["checkout", "main"]);
    await werkboomSchoon();
  });

  test("19 · een bestaande pull request wordt hergebruikt in plaats van verdubbeld", async () => {
    const versieId = await goedgekeurd("uitrol-prbestaat");
    await nepGh(
      'case "$1 $2" in\n' +
        '"pr list") echo \'[{"url":"https://github.com/vibe/vibe-website/pull/42"}]\';;\n' +
        '"pr create") echo "EEN TWEEDE PR MAG NIET" >&2; exit 9;;\n' +
        "*) exit 0;;\nesac",
    );
    try {
      const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        maakPublicatiePr(c, org, versieId, {
          siteWortel: site,
          pool: db.pool,
          basisBranch: "main",
          actor,
          openPr: true,
        }),
      );
      assert.ok(uit.geslaagd, `de keten hoort te slagen: ${verslag(uit)}`);
      assert.equal(uit.prUrl, "https://github.com/vibe/vibe-website/pull/42");
      assert.ok(
        uit.grendels.some((g) => g.naam === "bestaande pull request hergebruikt" && g.ok),
        "het hergebruik hoort in de grendeltabel te staan",
      );
    } finally {
      zonderNepGh();
    }
    const git = maakGit(site);
    await git(["checkout", "main"]);
    await werkboomSchoon();
  });

  test("20 · een generator die een verboden bestand aanraakt breekt de keten af en draait terug", async () => {
    const versieId = await goedgekeurd("uitrol-verboden");
    const git = maakGit(site);

    /* De slechte generator moet GECOMMIT zijn, anders struikelt de keten
       al op grendel 5 (schone werkboom) en toetst deze zaak niets. */
    await writeFile(
      join(site, "scripts", "seo", "bouw.mjs"),
      `${GOEDE_GENERATOR}\nwriteFileSync(resolve(wortel, 'vibe-chrome.js'), 'ik hoor hier niet\\n');\n`,
      "utf8",
    );
    await git(["add", "-A"]);
    await git(["-c", "user.name=toets", "-c", "user.email=t@t.nl", "commit", "-m", "slechte generator"]);
    await git(["push", "origin", "main"]);

    try {
      const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
        maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main", actor }),
      );
      assert.equal(uit.geslaagd, false);
      assert.match(uit.reden, /niet mag aanraken/);

      const na = await stand(db, org, versieId);
      assert.equal(na.status, "goedgekeurd", "de goedkeuring hoort te blijven staan");
      assert.ok(!existsSync(join(site, "data", "inhoud", "nieuws", "uitrol-verboden.json")));
      await werkboomSchoon();
    } finally {
      await git(["checkout", "main"]);
      await writeFile(join(site, "scripts", "seo", "bouw.mjs"), GOEDE_GENERATOR, "utf8");
      await git(["add", "-A"]);
      await git(["-c", "user.name=toets", "-c", "user.email=t@t.nl", "commit", "-m", "generator terug"]);
      await git(["push", "origin", "main"]);
    }
  });

  test("21 · terugdraaien gebruikt de meegegeven sitewortel en niet de omgeving", async () => {
    /* Deze zaak dekt het gat dat deze ronde repareert: publiceer() en
       draaiTerug() namen INTEL_SITE_WORTEL, terwijl git en de generator
       op de meegegeven wortel draaiden. In de toets wijst
       INTEL_SITE_WORTEL naar de repository van de ontwikkelaar, niet naar
       deze tijdelijke site — dus als de doorgifte niet werkte, zou het
       record hier NIET staan en de hele keten toch PASS melden. */
    const versieId = await goedgekeurd("uitrol-wortel");
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      maakPublicatiePr(c, org, versieId, { siteWortel: site, pool: db.pool, basisBranch: "main", actor }),
    );
    assert.ok(uit.geslaagd, uit.reden);
    const bestand = join(site, "data", "inhoud", "nieuws", "uitrol-wortel.json");
    assert.ok(existsSync(bestand), "het record hoort in de MEEGEGEVEN wortel te staan");

    const publicatieId = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ id: number }>(
        "select id from intel.publicaties where inhoud_versie_id = $1 order by id desc limit 1",
        [versieId],
      );
      return r.rows[0]!.id;
    });
    const terug = await draaiTerug(db.pool, org, publicatieId, { siteWortel: site, actor });
    assert.match(terug.reden, /verwijderd|hersteld/);
    assert.ok(!existsSync(bestand), "terugdraaien hoort het record uit DEZE wortel te halen");

    const git = maakGit(site);
    await git(["checkout", "main"]);
    await git(["clean", "-fd", "--", "data/inhoud/nieuws"]);
    await werkboomSchoon();
  });
});
