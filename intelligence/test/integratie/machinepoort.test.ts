/* ============================================================
   TEST — de machinepoort van de uitgifte, over HTTP
   ------------------------------------------------------------
   WAAROM DEZE SUITE OVER HTTP MOET, EN NIET LANGS DE FUNCTIES.

   test/integratie/uitgifte-keten.test.ts toetst de uitgiftelaag al
   volledig: de vijf fasen, de toestandsmachine, de hash als grens, en de
   echte generator tegen een echte repokopie. Al die zaken roepen
   `aanvaardRecord()` en `aanvaardPr()` RECHTSTREEKS aan.

   Daarmee is bewezen dat de LAAG klopt, en niets over de POORT die hem
   publiek maakt. En die poort is het enige deel van dit platform dat op
   een internetgerichte dienst staat en van buiten mag schrijven: hij
   hangt niet aan een sessiekoekje van een mens maar aan één
   omgevingsvariabele, en de repository waarin de uitvoerder draait is
   PUBLIEK. Elke zaak hieronder sluit dus één weg af die alleen over HTTP
   bestaat:

     1   zonder sleutel is er geen poort (fail-closed, ook /stand)
     2   een te korte sleutel is geen sleutel
     3   geen, verkeerde, bijna-goede en verkeerd-geplaatste sleutel
     4   met de juiste sleutel leest de wachtrij, met een stopreden
     5   de poort neemt geen INHOUD aan
     6   de organisatie komt niet uit het verzoek
     7   een onbekende fase is een 400, geen poging
     8   een fase uit zijn orde is een 409
     9   en de geldige keten werkt wel
     10  elke melding is 'systeem', met een grond uit het register
     11  de sessieweg en de machineweg kruisen elkaar niet

   DE OPZET. De echte app draait op een efemere poort op 127.0.0.1 tegen
   een eigen wegwerpdatabase, en er wordt met `fetch` tegenaan gepraat —
   zoals de GitHub-werkstroom het in productie doet. Er gaat geen enkel
   verzoek naar buiten en er wordt niets gepubliceerd: de generator
   draait hier niet (dat doet uitgifte-keten.test.ts tegen een echte
   repokopie) en `publiceer()` schrijft met een hash van de uitvoerder
   per ontwerp niets op schijf.

   DE ORGANISATIE VAN DE SERVER IS EEN CONFIGURATIEWAARDE.
   `huidigeOrganisatie()` zoekt de organisatie met sleutel
   INTEL_ORGANISATIE. Deze suite zet die variabele op zijn eigen sleutel
   en maakt daarnaast een TWEEDE organisatie met een eigen goedgekeurde
   versie. Dat is wat zaak 6 nodig heeft: een melding die zou slagen als
   de poort de organisatie uit het verzoek haalde.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import type { Server } from "node:http";

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
import { MIN_SLEUTELLENGTE } from "../../src/dashboard/machine.ts";
import { SYSTEEMGRONDEN } from "../../src/inhoud/actor.ts";
import { automatischPubliceren } from "../../src/inhoud/autopublicatie.ts";
import { inhoudAfdruk } from "../../src/inhoud/concept.ts";
import type { WachtrijUitslag } from "../../src/uitgifte/opdracht.ts";

/** De sleutel van de organisatie waarvoor DEZE server is geconfigureerd. */
const ORG_SLEUTEL = "machinepoort-eigen";
/** En een tweede organisatie, die de poort nooit mag besturen. */
const ANDER_SLEUTEL = "machinepoort-ander";

/** Een geldige machinesleutel: ruim boven de ondergrens. */
const SLEUTEL = `machinepoort-${"s".repeat(40)}`;
/** Het sessiegeheim voor de MENSELIJKE weg, die zaak 11 ernaast legt. */
const GEHEIM = "g".repeat(40);

type Antwoord = {
  readonly status: number;
  readonly tekst: string;
  /** Het JSON-lichaam, of een leeg object als het antwoord geen JSON was. */
  readonly lichaam: Record<string, unknown>;
  readonly locatie: string | null;
};

type VraagOpties = {
  readonly methode?: "GET" | "POST";
  /** `null` stuurt GEEN Authorization-kop; anders de meegegeven sleutel. */
  readonly sleutel?: string | null;
  /** Een Authorization-kop die zelf zijn vorm bepaalt (dus zonder 'Bearer '). */
  readonly ruweKop?: string;
  readonly lichaam?: unknown;
  readonly koekje?: string;
};

describe("de machinepoort van de uitgifte", () => {
  let db: Wegwerpdatabase;
  let org = 0;
  let ander = 0;
  let chef = 0;
  let auteur = 0;
  let anderAuteur = 0;
  let server: Server;
  let basis = "";
  let teller = 0;

  /** De versie voor zaak 5: goedgekeurd, en blijft dat de hele run. */
  let versieHash = 0;
  /** De versie voor zaak 9: de geldige keten. */
  let versieKeten = 0;
  /** Een versie ZONDER fase, voor zaak 8. */
  let versieZonderFase = 0;
  /** Een goedgekeurde versie in de ANDERE organisatie, voor zaak 6. */
  let versieVreemd = 0;
  /** De beleidsversie waaronder de fixtures zijn GOEDGEKEURD. */
  let beleidVanGoedkeuring = "";

  before(async () => {
    /* ALLES WAT DE SERVER UIT ZIJN OMGEVING LEEST, STAAT HIER.
       configLezen() cachet, dus de variabelen moeten staan vóór het
       eerste verzoek; maakWegwerpdatabase() gooit de cache zelf weg en
       .env overschrijft een bestaande variabele niet (zie
       laadEnvBestand). 'test' houdt cookieSecure() leeg en zet geen
       HSTS. */
    process.env["INTEL_OMGEVING"] = "test";
    process.env["INTEL_ORGANISATIE"] = ORG_SLEUTEL;
    process.env["INTEL_SESSIE_GEHEIM"] = GEHEIM;
    process.env["INTEL_MACHINE_SLEUTEL"] = SLEUTEL;

    db = await maakWegwerpdatabase("machinepoort");
    configVergeten();

    org = await maakOrganisatie(db, ORG_SLEUTEL);
    ander = await maakOrganisatie(db, ANDER_SLEUTEL);
    chef = await maakGebruiker(db, org, "chef@test.nl", "beheerder");
    auteur = await maakGebruiker(db, org, "schrijver@test.nl", "analist");
    anderAuteur = await maakGebruiker(db, ander, "vreemd@test.nl", "analist");

    beleidVanGoedkeuring = await zetBeleid({ autoAan: true, uitgifteAan: true });
    await zetBeleid({ autoAan: true, uitgifteAan: true, doelOrg: ander });

    /* ÉÉN VERSIE PER RONDE, EN DAT IS GEEN NETHEID.
       Voorwaarde 7 van de autopublicatie weigert een versie die is
       'achterhaald' door een NIEUWERE gebeurtenis met twee gedeelde
       onderwerptermen. Twee fixtures die tegelijk in de werkvoorraad
       staan zijn per constructie elkaars onderwerp, en de laatst
       aangemaakte heeft de nieuwste gebeurtenis. Door per versie één
       ronde te draaien staat er nooit meer dan één in ter_review. */
    versieHash = await maakGoedgekeurdeVersie("ae");
    versieKeten = await maakGoedgekeurdeVersie("be");
    versieVreemd = await maakGoedgekeurdeVersie("ce", { doelOrg: ander, doelAuteur: anderAuteur });

    /* EN NA DE RONDES NOG ÉÉN DIE NOOIT IS GOEDGEKEURD. Hij blijft op
       ter_review staan en heeft dus GEEN regel in het logboek — precies
       de toestand die zaak 8 nodig heeft. Omdat er na deze regel geen
       ronde meer draait, blijft hij dat ook. */
    versieZonderFase = (await maakVersie("de")).versieId;

    const app = maakApp(db.pool);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", () => r()));
    basis = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await db.opruimen();
    /* DE SLEUTEL HOORT NIET IN DE OMGEVING VAN EEN VOLGEND TESTBESTAND.
       `node --test` kan bestanden in hetzelfde proces draaien, en een
       achtergebleven machinesleutel zou daar een poort openzetten die
       die suite niet verwacht. */
    delete process.env["INTEL_MACHINE_SLEUTEL"];
    delete process.env["INTEL_ORGANISATIE"];
    configVergeten();
  });

  /* ---------------------------------------------------- hulpmiddelen */

  /** Zet een nieuwe ACTIEVE beleidsrij en zet de vorige uit. */
  async function zetBeleid(o: {
    autoAan: boolean;
    uitgifteAan: boolean;
    doelOrg?: number;
  }): Promise<string> {
    const doel = o.doelOrg ?? org;
    const versie = `machinepoort-${(teller += 1)}`;
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doel)]);
      await c.query("update intel.publicatiebeleid set actief = false where organisatie_id = $1", [
        doel,
      ]);
      await c.query(
        `insert into intel.publicatiebeleid
           (organisatie_id, versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit, actief)
         values ($1, $2, $3, $4, 'laag', array['nieuw_artikel'], 1, 3, true)`,
        [doel, versie, o.autoAan, o.uitgifteAan],
      );
    });
    return versie;
  }

  /**
   * Een publiceerbare versie met een EIGEN tekst.
   *
   * maakDragendeVersie() geeft elke versie dezelfde titel, hetzelfde
   * directe antwoord en dezelfde body, en de inhoudsafdruk wordt daaruit
   * gerekend — niet uit het pad. Zonder eigen tekst dragen alle fixtures
   * dus dezelfde afdruk, en dan weigert voorwaarde 8 (duplicaat) elke
   * versie ná de eerste die echt is gepubliceerd. Het kenmerk is een
   * WOORD en geen getal: de poort `geen_verzonnen_getallen` eist dat elk
   * cijfer in de body terugkomt in een gebonden uitspraak.
   *
   * De gebeurtenis krijgt hier ook zijn `gebeurd_op`: het harnas laat die
   * leeg en voorwaarde 7 weigert dan terecht met "zonder datum is
   * actualiteit niet te meten".
   */
  async function maakVersie(
    kenmerk: string,
    o: { doelOrg?: number; doelAuteur?: number } = {},
  ): Promise<{ versieId: number; slug: string }> {
    const doel = o.doelOrg ?? org;
    const slug = `machinepoort-zaak-${kenmerk}`;
    const v = await maakDragendeVersie(db, doel, {
      slug,
      risico: "laag",
      aangemaaktDoor: o.doelAuteur ?? auteur,
      publiceerbaar: true,
      /* 'acm-besluiten' staat in src/bronnen/register.ts als
         toezichthouder en kan een bericht dus zelfstandig dragen; een
         verzonnen sleutel valt terug op MARKTPARTIJ. */
      bronSleutel: "acm-besluiten",
    });

    const kop = kenmerk.toUpperCase();
    const titel = `Netbeheerder ${kop} verruimt de aansluittermijn voor bedrijven`;
    const direct = `De aansluittermijn in regio ${kop} is verruimd voor zakelijke aanvragen.`;
    const body =
      `De netbeheerder in regio ${kop} verruimt de termijn waarop bedrijven een zwaardere ` +
      `aansluiting kunnen aanvragen.\n\n` +
      `## Wat er is vastgelegd\n\n` +
      `Het besluit over regio ${kop} noemt de nieuwe termijn en de voorwaarden waaronder een ` +
      `bedrijf er aanspraak op maakt. De oude termijn blijft gelden voor lopende aanvragen in ` +
      `dezelfde regio.\n\n` +
      `## Wat dit voor u betekent\n\n` +
      `Wie in regio ${kop} op een zwaardere aansluiting wacht, krijgt meer ruimte om zijn ` +
      `aanvraag te onderbouwen. Wilt u weten wat dit voor uw pand betekent? ` +
      `[Plan een gesprek](/contact).\n`;

    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(doel)]);
      await c.query(
        `update intel.markt_gebeurtenissen g
            set gebeurd_op = now() - interval '1 day',
                titel      = $3
          where g.organisatie_id = $1
            and g.id = (select k.gebeurtenis_id
                          from intel.inhoud_versies v
                          join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
                         where v.id = $2)`,
        [doel, v.versieId, titel],
      );
      const r = await c.query<{ structured_data: unknown }>(
        "select structured_data from intel.inhoud_versies where id = $1",
        [v.versieId],
      );
      const afdruk = inhoudAfdruk({
        titel,
        directAntwoord: direct,
        bodyMarkdown: body,
        structuredData: r.rows[0]!.structured_data,
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

  /** Dezelfde versie, maar dan door het BELEID goedgekeurd (fase GOEDGEKEURD). */
  async function maakGoedgekeurdeVersie(
    kenmerk: string,
    o: { doelOrg?: number; doelAuteur?: number } = {},
  ): Promise<number> {
    const doel = o.doelOrg ?? org;
    const { versieId } = await maakVersie(kenmerk, o);
    const ronde = await automatischPubliceren(db.pool, doel, {});
    assert.equal(ronde.beleidReden, null, `het beleid stond niet aan: ${String(ronde.beleidReden)}`);
    assert.ok(
      ronde.wachtOpUitgifte.some((w) => w.inhoudVersieId === versieId),
      `versie ${versieId} hoort na de ronde op de uitgifte te wachten; ` +
        `geweigerd=${JSON.stringify(ronde.geweigerd)}`,
    );
    assert.deepEqual(
      await fasen(versieId, doel),
      ["GOEDGEKEURD"],
      "de ronde keurt goed en publiceert niet; het record schrijft een uitvoerder",
    );
    return versieId;
  }

  /** De fasen in het logboek van een versie, in volgorde. */
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

  type Regel = {
    fase: string | null;
    grond: string | null;
    actor_soort: string;
    door_gebruiker_id: number | null;
    door_rol: string | null;
    beleid_versie: string | null;
  };

  /** De volledige herkomstkolommen van elke besluitregel van een versie. */
  async function regels(versieId: number, doelOrg = org): Promise<Regel[]> {
    return metOrganisatie(db.pool, { organisatieId: doelOrg }, async (c) => {
      const r = await c.query<Regel>(
        `select poortresultaten->>'fase'  as fase,
                poortresultaten->>'grond' as grond,
                actor_soort, door_gebruiker_id, door_rol, beleid_versie
           from intel.publicatiebesluiten
          where organisatie_id = $1 and inhoud_versie_id = $2
          order by id`,
        [doelOrg, versieId],
      );
      return r.rows;
    });
  }

  /** De publicatierijen van een versie: bestandspad en hash van het record. */
  async function publicaties(
    versieId: number,
    doelOrg = org,
  ): Promise<{ bestandspad: string; bestand_hash: string; status: string }[]> {
    return metOrganisatie(db.pool, { organisatieId: doelOrg }, async (c) => {
      const r = await c.query<{ bestandspad: string; bestand_hash: string; status: string }>(
        `select bestandspad, bestand_hash, status
           from intel.publicaties
          where organisatie_id = $1 and inhoud_versie_id = $2
          order by id`,
        [doelOrg, versieId],
      );
      return r.rows;
    });
  }

  /** De opgeslagen tekst van een versie; zaak 5 meet of die ONGEMOEID blijft. */
  async function tekstVan(versieId: number): Promise<{ titel: string; body: string }> {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ titel: string; body_markdown: string }>(
        "select titel, body_markdown from intel.inhoud_versies where id = $1",
        [versieId],
      );
      return { titel: r.rows[0]!.titel, body: r.rows[0]!.body_markdown };
    });
  }

  /**
   * Eén verzoek aan de poort.
   *
   * `sleutel: null` stuurt GEEN Authorization-kop; `ruweKop` stuurt een
   * kop die zelf de vorm bepaalt. Alles wat niet JSON is komt in `tekst`
   * terecht, zodat een HTML-foutpagina ook meetbaar is.
   */
  async function vraag(pad: string, o: VraagOpties = {}): Promise<Antwoord> {
    const koppen: Record<string, string> = {};
    if (o.ruweKop !== undefined) koppen["authorization"] = o.ruweKop;
    else if (o.sleutel !== null) koppen["authorization"] = `Bearer ${o.sleutel ?? SLEUTEL}`;
    if (o.koekje !== undefined) koppen["cookie"] = o.koekje;
    if (o.lichaam !== undefined) koppen["content-type"] = "application/json";

    const r = await fetch(`${basis}${pad}`, {
      method: o.methode ?? (o.lichaam === undefined ? "GET" : "POST"),
      redirect: "manual",
      headers: koppen,
      ...(o.lichaam === undefined ? {} : { body: JSON.stringify(o.lichaam) }),
    });
    const tekst = await r.text();
    let lichaam: Record<string, unknown> = {};
    try {
      const ontleed: unknown = JSON.parse(tekst);
      if (ontleed !== null && typeof ontleed === "object") {
        lichaam = ontleed as Record<string, unknown>;
      }
    } catch {
      /* geen JSON: `tekst` blijft de meting. */
    }
    return { status: r.status, tekst, lichaam, locatie: r.headers.get("location") };
  }

  /** De wachtrij, met de ECHTE typen van de uitgiftelaag. */
  async function wachtrij(): Promise<{ status: number; uit: WachtrijUitslag }> {
    const r = await vraag("/machine/uitgifte");
    return { status: r.status, uit: r.lichaam as unknown as WachtrijUitslag };
  }

  /** Een fase terugmelden. `extra` gaat als los veld in het lichaam mee. */
  async function meld(
    versieId: number | string,
    fase: string,
    bewijs: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ): Promise<Antwoord> {
    return vraag(`/machine/uitgifte/${versieId}`, { lichaam: { fase, bewijs, ...extra } });
  }

  /**
   * De drie routes die de poort heeft; elke zaak over de WACHT raakt alle
   * drie. Er is geen pad dat de wacht overslaat, en dat hoort niet uit
   * één steekproef te blijken.
   *
   * HET LICHAAM VAN DE POST IS MET OPZET ONSCHADELIJK: een hash die de
   * server nooit bouwt. Zou de wacht ooit doorlaten, dan valt de zaak om
   * op de statuscode en niet op iets dat deze toets zelf heeft
   * vastgelegd.
   */
  const ROUTES: readonly { pad: string; methode: "GET" | "POST"; lichaam?: unknown }[] = [
    { pad: "/machine/stand", methode: "GET" },
    { pad: "/machine/uitgifte", methode: "GET" },
    {
      pad: "/machine/uitgifte/1",
      methode: "POST",
      lichaam: {
        fase: "RECORD_GESCHREVEN",
        bewijs: { recordHash: "0".repeat(64), waar: "poortwacht", beleidVersie: "geen" },
      },
    },
  ];

  /* ================================================================
     1 en 2 — zonder bruikbare sleutel is er geen poort
     ================================================================ */

  test("1 · zonder INTEL_MACHINE_SLEUTEL antwoordt ELKE route 503 en noemt de variabele", async () => {
    /* FAIL-CLOSED, EN OOK OP DE LEESROUTE. /machine/stand geeft de SHA
       van deze server; dat is geen geheim (de repository is publiek),
       maar een platform waarvan de ene route zonder sleutel doorwerkt
       heeft geen poort maar een gewoonte. machinesleutel() leest de
       variabele bij ELKE aanroep, dus hem hier omzetten is genoeg. */
    for (const waarde of [undefined, "", "   "]) {
      if (waarde === undefined) delete process.env["INTEL_MACHINE_SLEUTEL"];
      else process.env["INTEL_MACHINE_SLEUTEL"] = waarde;
      try {
        for (const r of ROUTES) {
          const a = await vraag(r.pad, { methode: r.methode, lichaam: r.lichaam });
          assert.equal(
            a.status,
            503,
            `${r.methode} ${r.pad} met sleutel ${JSON.stringify(waarde)} gaf ${a.status}: ` +
              `${a.tekst.slice(0, 200)}`,
          );
          assert.match(
            String(a.lichaam["fout"] ?? ""),
            /INTEL_MACHINE_SLEUTEL/,
            "het antwoord hoort te zeggen WELKE variabele ontbreekt",
          );
        }
      } finally {
        process.env["INTEL_MACHINE_SLEUTEL"] = SLEUTEL;
      }
    }
  });

  test(`2 · een sleutel van ${MIN_SLEUTELLENGTE - 1} tekens is geen sleutel: 503`, async () => {
    /* DE ONDERGRENS KOMT UIT DE CODE EN NIET UIT DEZE TOETS. Zou iemand
       MIN_SLEUTELLENGTE verlagen, dan verschuift deze zaak mee en blijft
       hij meten wat hij beweert: één teken te kort is geen sleutel. */
    const teKort = "k".repeat(MIN_SLEUTELLENGTE - 1);
    process.env["INTEL_MACHINE_SLEUTEL"] = teKort;
    try {
      for (const r of ROUTES) {
        const a = await vraag(r.pad, { methode: r.methode, lichaam: r.lichaam, sleutel: teKort });
        assert.equal(a.status, 503, `${r.methode} ${r.pad} gaf ${a.status}`);
        assert.match(String(a.lichaam["fout"] ?? ""), /INTEL_MACHINE_SLEUTEL/);
      }
    } finally {
      process.env["INTEL_MACHINE_SLEUTEL"] = SLEUTEL;
    }

    /* EN DE GRENS VAN DE ANDERE KANT, want anders meet deze zaak alleen
       dat 503 bestaat. Precies MIN_SLEUTELLENGTE tekens is wél een
       sleutel; één teken minder is het niet. */
    const netLang = "k".repeat(MIN_SLEUTELLENGTE);
    process.env["INTEL_MACHINE_SLEUTEL"] = netLang;
    try {
      const a = await vraag("/machine/stand", { sleutel: netLang });
      assert.equal(a.status, 200, `een sleutel van ${MIN_SLEUTELLENGTE} tekens hoort te werken`);
    } finally {
      process.env["INTEL_MACHINE_SLEUTEL"] = SLEUTEL;
    }
  });

  /* ================================================================
     3 — vier manieren om de sleutel NIET te geven
     ================================================================ */

  test("3 · geen, verkeerde, bijna-goede en verkeerd-geplaatste sleutel geven 401", async () => {
    /* EEN SLEUTEL MET DE JUISTE LENGTE EN ÉÉN ANDER TEKEN is de zaak die
       timingSafeEqual verdient: bij gelijke lengte komt de vergelijking
       er echt langs in plaats van op de lengte af te ketsen. */
    const bijna = `${SLEUTEL.slice(0, -1)}X`;
    assert.equal(bijna.length, SLEUTEL.length, "deze zaak hoort op lengte te matchen");
    assert.notEqual(bijna, SLEUTEL);

    const pogingen: readonly { naam: string; opties: VraagOpties }[] = [
      { naam: "geen Authorization-kop", opties: { sleutel: null } },
      { naam: "een verkeerde sleutel", opties: { sleutel: "fout" } },
      { naam: "de juiste lengte, één ander teken", opties: { sleutel: bijna } },
      { naam: "de sleutel zonder 'Bearer '", opties: { ruweKop: SLEUTEL } },
    ];

    for (const p of pogingen) {
      for (const r of ROUTES) {
        const a = await vraag(r.pad, { ...p.opties, methode: r.methode, lichaam: r.lichaam });
        assert.equal(a.status, 401, `${r.methode} ${r.pad} met ${p.naam} gaf ${a.status}`);
      }
    }

    /* EN DE SLEUTEL ALS QUERYPARAMETER IS GEEN SLEUTEL. Een URL belandt
       in proxylogs, in de browsergeschiedenis en in de Referer; een
       poort die hem daar zou aannemen, zou zijn geheim in elk logboek
       langs de weg achterlaten. */
    for (const pad of [
      `/machine/stand?sleutel=${encodeURIComponent(SLEUTEL)}`,
      `/machine/uitgifte?sleutel=${encodeURIComponent(SLEUTEL)}`,
      `/machine/uitgifte?token=${encodeURIComponent(SLEUTEL)}`,
    ]) {
      const a = await vraag(pad, { sleutel: null });
      assert.equal(a.status, 401, `${pad} gaf ${a.status}: ${a.tekst.slice(0, 200)}`);
    }
  });

  /* ================================================================
     4 — met de juiste sleutel: de wachtrij, met een stopreden
     ================================================================ */

  test("4 · met beide beleidsschakelaars UIT is de wachtrij leeg, met een stopreden", async () => {
    await zetBeleid({ autoAan: false, uitgifteAan: false });
    const { status, uit } = await wachtrij();
    assert.equal(status, 200, "met de juiste sleutel hoort de wachtrij leesbaar te zijn");
    assert.equal(uit.beleid?.autoAan, false);
    assert.equal(uit.beleid?.uitgifteAan, false);
    assert.equal(
      uit.opdrachten.length,
      0,
      `een harde stop is een LEGE wachtrij, kreeg ${JSON.stringify(uit.opdrachten.map((o) => o.inhoudVersieId))}`,
    );
    assert.ok(
      uit.stop.some((s) => s.sleutel === "beleid_uit"),
      `er hoort een stopreden 'beleid_uit' te staan, kreeg ${JSON.stringify(uit.stop)}`,
    );
    assert.match(
      uit.stop.map((s) => s.reden).join(" "),
      /auto_publiceren_aan=false/,
      "de reden hoort te NOEMEN welke schakelaar uit staat",
    );

    /* En de stand leest ook; die hangt aan niets in de database. */
    const stand = await vraag("/machine/stand");
    assert.equal(stand.status, 200);
    assert.equal(stand.lichaam["omgeving"], "test");
    assert.ok(typeof stand.lichaam["op"] === "string", "de stand hoort een tijdstip te dragen");
  });

  /* ================================================================
     5 — de poort neemt geen INHOUD aan
     ================================================================ */

  test("5 · een andere recordhash legt niets vast, en meegestuurde inhoud doet niets", async () => {
    const voorFasen = await fasen(versieHash);
    const voorTekst = await tekstVan(versieHash);
    assert.deepEqual(voorFasen, ["GOEDGEKEURD"], "deze versie staat klaar voor een record");

    /* HET VIJANDIGE VERZOEK. Hij meldt een hash die de server niet
       bouwt, EN stuurt de bytes mee die hij graag gepubliceerd zou zien.
       Er is geen veld waarin die bytes terechtkomen: publiceer() bouwt
       het record uit de database en vergelijkt zijn eigen hash. */
    const vreemdeTekst = "# Overgenomen tekst\n\nDit hoort nergens te belanden.\n";
    const a = await meld(versieHash, "RECORD_GESCHREVEN", {
      recordHash: "0".repeat(64),
      waar: "een verzonnen melding",
      beleidVersie: "machinepoort-verzonnen",
      recordInhoud: vreemdeTekst,
      body_markdown: vreemdeTekst,
      titel: "Een titel van de uitvoerder",
    });
    assert.equal(a.status, 409, `een onbekende hash hoort 409 te geven, kreeg ${a.status}: ${a.tekst.slice(0, 300)}`);

    assert.deepEqual(
      await fasen(versieHash),
      voorFasen,
      "er hoort GEEN regel in intel.publicatiebesluiten bij te komen",
    );
    assert.equal(
      (await publicaties(versieHash)).length,
      0,
      "en er hoort geen publicatierij te bestaan",
    );
    const naTekst = await tekstVan(versieHash);
    assert.deepEqual(naTekst, voorTekst, "de versie houdt zijn eigen tekst en titel");
    assert.ok(!naTekst.body.includes("Overgenomen tekst"), "de meegestuurde bytes mogen nergens landen");

    /* EN OOK OP HET TOPNIVEAU VAN HET LICHAAM NIET. `bewijs` is de enige
       plek die de route uitleest; een veld ernaast is geen tweede weg. */
    const b = await meld(
      versieHash,
      "RECORD_GESCHREVEN",
      { recordHash: "0".repeat(64), waar: "nogmaals", beleidVersie: "machinepoort-verzonnen" },
      { recordInhoud: vreemdeTekst, body_markdown: vreemdeTekst },
    );
    assert.equal(b.status, 409, `${b.status}: ${b.tekst.slice(0, 300)}`);
    assert.deepEqual(await fasen(versieHash), voorFasen);
    assert.deepEqual(await tekstVan(versieHash), voorTekst);
  });

  /* ================================================================
     6 — de organisatie komt niet uit het verzoek
     ================================================================ */

  test("6 · een organisatieId in het verzoek bestuurt de andere organisatie niet", async () => {
    /* DE ZAAK IS SCHERP OMDAT DE MELDING ZOU KUNNEN SLAGEN.
       versieVreemd staat in de ANDERE organisatie op fase GOEDGEKEURD;
       RECORD_GESCHREVEN is daar dus een geldige volgende fase. Haalde de
       poort zijn organisatie uit het verzoek, dan was dit een geslaagde
       publicatie in een organisatie waar deze sleutel niets te zoeken
       heeft. Met de organisatie uit de SERVERconfiguratie ziet de poort
       die versie niet en is er geen fase om op te volgen. */
    const voor = await fasen(versieVreemd, ander);
    assert.deepEqual(voor, ["GOEDGEKEURD"], "de vreemde versie staat klaar in haar eigen organisatie");

    const a = await meld(
      versieVreemd,
      "RECORD_GESCHREVEN",
      {
        recordHash: "0".repeat(64),
        waar: "melding voor een andere organisatie",
        beleidVersie: "machinepoort-verzonnen",
        organisatieId: ander,
      },
      { organisatieId: ander, organisatie: ANDER_SLEUTEL },
    );
    assert.equal(a.status, 409, `${a.status}: ${a.tekst.slice(0, 300)}`);
    assert.match(
      String(a.lichaam["fout"] ?? ""),
      /kan niet volgen op GEEN FASE/,
      "de poort hoort in ZIJN organisatie te kijken, waar deze versie geen fase heeft",
    );

    assert.deepEqual(
      await fasen(versieVreemd, ander),
      voor,
      "er hoort niets in de andere organisatie te zijn bijgeschreven",
    );
    assert.equal((await publicaties(versieVreemd, ander)).length, 0);
    assert.deepEqual(
      await fasen(versieVreemd, org),
      [],
      "en in de eigen organisatie bestaat die versie niet",
    );
  });

  /* ================================================================
     7 en 8 — een fase die niet bestaat, en een fase uit zijn orde
     ================================================================ */

  test("7 · een onbekende fase geeft 400 en noemt de geldige fasen", async () => {
    /* LET OP DE BELEIDSVERSIE. De route leest `bewijs.beleidVersie`
       VOORDAT hij de fase uitzoekt, en een ontbrekende beleidsversie is
       een 409. Zonder dat veld meet deze zaak dus de verkeerde grens. */
    for (const fase of ["GEPUBLICEERD", "record_geschreven", "", "LIVE"]) {
      const a = await meld(versieZonderFase, fase, { beleidVersie: "machinepoort-verzonnen" });
      assert.equal(a.status, 400, `fase '${fase}' gaf ${a.status}: ${a.tekst.slice(0, 200)}`);
      const fout = String(a.lichaam["fout"] ?? "");
      for (const geldig of [
        "RECORD_GESCHREVEN",
        "PR_AANGEMAAKT",
        "PR_GEMERGED",
        "LIVE_GEVERIFIEERD",
        "GEBLOKKEERD",
      ]) {
        assert.ok(fout.includes(geldig), `de foutregel hoort ${geldig} te noemen: ${fout}`);
      }
    }
    assert.deepEqual(await fasen(versieZonderFase), [], "een 400 schrijft niets");
  });

  test("8 · een fase uit zijn orde geeft 409", async () => {
    assert.deepEqual(await fasen(versieZonderFase), [], "deze versie heeft nog geen enkele fase");

    const merge = await meld(versieZonderFase, "PR_GEMERGED", {
      mergeCommit: "a".repeat(40),
      checksGroen: ["Release 1", "Release 2", "Beveiliging"],
      beleidVersie: "machinepoort-verzonnen",
    });
    assert.equal(merge.status, 409, `${merge.status}: ${merge.tekst.slice(0, 300)}`);
    assert.match(String(merge.lichaam["fout"] ?? ""), /kan niet volgen op GEEN FASE/);

    const pr = await meld(versieZonderFase, "PR_AANGEMAAKT", {
      branch: "publicatie/verzonnen",
      commit: "b".repeat(40),
      beleidVersie: "machinepoort-verzonnen",
    });
    assert.equal(pr.status, 409, `${pr.status}: ${pr.tekst.slice(0, 300)}`);

    const live = await meld(versieZonderFase, "LIVE_GEVERIFIEERD", {
      gemergedInMain: true,
      beleidVersie: "machinepoort-verzonnen",
    });
    assert.equal(live.status, 409, `${live.status}: ${live.tekst.slice(0, 300)}`);

    assert.deepEqual(await fasen(versieZonderFase), [], "en geen van de drie legt iets vast");
  });

  /* ================================================================
     9 — de geldige keten werkt wel
     ================================================================ */

  test("9 · RECORD_GESCHREVEN met de ECHTE hash, dan PR_AANGEMAAKT", async () => {
    /* ZAAK 4 ZETTE HET BELEID UIT; hier gaat het weer aan, en dus staat
       er nu een NIEUWERE actieve beleidsrij dan die de goedkeuring gaf. */
    const nuActief = await zetBeleid({ autoAan: true, uitgifteAan: true });
    assert.notEqual(nuActief, beleidVanGoedkeuring, "het actieve beleid is een nieuwere rij");

    const { status, uit } = await wachtrij();
    assert.equal(status, 200);
    assert.deepEqual([...uit.stop], [], `de wachtrij hoort open te staan: ${JSON.stringify(uit.stop)}`);
    assert.equal(uit.beleid?.versie, nuActief, "de wachtrij leest het ACTIEVE beleid");
    const opdracht = uit.opdrachten.find((o) => o.inhoudVersieId === versieKeten);
    assert.ok(
      opdracht !== undefined,
      `geen opdracht voor versie ${versieKeten}: geweigerd=${JSON.stringify(uit.geweigerd)} ` +
        `opdrachten=${JSON.stringify(uit.opdrachten.map((o) => o.inhoudVersieId))}`,
    );
    assert.match(opdracht.recordHash, /^[0-9a-f]{64}$/, "de opdracht draagt een sha256 van het record");
    assert.ok(opdracht.recordInhoud.includes('"route"'), "en de bytes zelf");
    /* HET MANDAAT VAN DEZE OPDRACHT IS HET BELEID VAN DE GOEDKEURING, en
       niet het beleid dat nu toevallig actief is. Gemeten toen deze zaak
       nog de nieuwe rij verwachtte: de opdracht droeg 'machinepoort-1'
       (de goedkeurende rij) tegen 'machinepoort-4' (de actieve). Dat is
       het juiste gedrag — `goedkeurend_beleid` staat op de versie — en
       het is ook de waarde die in het logboek hoort, want achteraf moet
       vaststaan onder WELKE regels dit artikel is vrijgegeven. */
    const beleid = opdracht.beleidVersie;
    assert.equal(beleid, beleidVanGoedkeuring, "de opdracht noemt het beleid van de GOEDKEURING");

    /* DE MELDING, MET DE ECHTE HASH — en met dezelfde vijandige velden
       als in zaak 5 erbij. Nu moet hij slagen ÉN moet de vastgelegde
       hash die van de SERVER zijn, niet iets uit het verzoek. */
    const vreemdeTekst = "# Overgenomen tekst\n\nDit hoort nergens te belanden.\n";
    const voorTekst = await tekstVan(versieKeten);
    const record = await meld(
      versieKeten,
      "RECORD_GESCHREVEN",
      {
        recordHash: opdracht.recordHash,
        waar: `${opdracht.branch}@${"c".repeat(40)}`,
        beleidVersie: beleid,
        recordInhoud: vreemdeTekst,
        organisatieId: ander,
      },
      { body_markdown: vreemdeTekst, organisatieId: ander },
    );
    assert.equal(record.status, 200, `${record.status}: ${record.tekst.slice(0, 400)}`);
    assert.equal(record.lichaam["ok"], true, String(record.lichaam["reden"] ?? ""));
    assert.ok(
      typeof record.lichaam["publicatieId"] === "number",
      `er hoort een publicatierij te zijn: ${JSON.stringify(record.lichaam)}`,
    );

    const rijen = await publicaties(versieKeten);
    assert.equal(rijen.length, 1, "precies één publicatierij");
    assert.equal(rijen[0]!.bestandspad, opdracht.bestandspad);
    assert.equal(
      rijen[0]!.bestand_hash,
      opdracht.recordHash,
      "de vastgelegde hash is die van het record dat de SERVER bouwde",
    );
    assert.deepEqual(await tekstVan(versieKeten), voorTekst, "en de tekst van de versie is niet geraakt");
    assert.equal(
      (await fasen(versieKeten, ander)).length,
      0,
      "het meegestuurde organisatieId heeft in de andere organisatie niets veroorzaakt",
    );

    /* FASE 3: de pull request. De commit moet een sha zijn; dat is de
       enige vorm waarin hij later in main terug te vinden is. */
    const pr = await meld(versieKeten, "PR_AANGEMAAKT", {
      branch: opdracht.branch,
      commit: "c".repeat(40),
      prNummer: 4242,
      prUrl: "https://github.com/MounirVB/vibe-website/pull/4242",
      beleidVersie: beleid,
    });
    assert.equal(pr.status, 200, `${pr.status}: ${pr.tekst.slice(0, 400)}`);
    assert.equal(pr.lichaam["ok"], true, String(pr.lichaam["reden"] ?? ""));

    /* DEZELFDE FASE TWEE KEER MELDEN IS GEEN FOUT EN GEEN TWEEDE REGEL.
       De uitvoerder kan opnieuw opstarten nadat hij heeft gemeld maar
       vóórdat hij het antwoord zag; een 409 zou hem dan laten denken dat
       hij iets verkeerd deed.

       GEMETEN ORDE, EN DE REDEN DAT DE SHA-POORT HIER NIET STAAT: de
       idempotentiecontrole in eisFase() komt VÓÓR de vormcontrole op de
       commit, dus een herhaalde melding wordt aanvaard zonder dat de
       commit opnieuw wordt getoetst. Dat legt niets vast en is dus geen
       gat, maar het betekent wel dat de sha-poort alleen te meten is op
       een versie die de fase nog niet heeft — en dat doet
       uitgifte-keten.test.ts (zaak 7c) rechtstreeks op aanvaardPr(). */
    const nogmaals = await meld(versieKeten, "PR_AANGEMAAKT", {
      branch: opdracht.branch,
      commit: "c".repeat(40),
      prNummer: 4242,
      beleidVersie: beleid,
    });
    assert.equal(nogmaals.status, 200, `${nogmaals.status}: ${nogmaals.tekst.slice(0, 300)}`);
    assert.match(String(nogmaals.lichaam["reden"] ?? ""), /stond al in het logboek/);

    assert.deepEqual(await fasen(versieKeten), ["GOEDGEKEURD", "RECORD_GESCHREVEN", "PR_AANGEMAAKT"]);
  });

  /* ================================================================
     10 — elke melding is 'systeem'
     ================================================================ */

  test("10 · de regels van de poort zijn 'systeem' met een grond uit het register", async () => {
    /* EEN MACHINESLEUTEL IS GEEN PERSOON. Zou een poortregel een
       `door_gebruiker_id` dragen, dan was in het auditspoor niet meer te
       zien welke handeling nooit een mens had — en dat is precies het
       onderscheid waarvoor actor.ts bestaat. */
    const alle = await regels(versieKeten);
    const vanDePoort = alle.filter((r) => r.fase === "RECORD_GESCHREVEN" || r.fase === "PR_AANGEMAAKT");
    assert.equal(vanDePoort.length, 2, `verwacht twee poortregels, kreeg ${JSON.stringify(alle)}`);

    const gronden = Object.keys(SYSTEEMGRONDEN);
    for (const r of vanDePoort) {
      assert.equal(r.actor_soort, "systeem", `fase ${String(r.fase)} hoort 'systeem' te zijn`);
      assert.equal(r.door_gebruiker_id, null, "een machinesleutel is geen persoon");
      assert.equal(r.door_rol, null, "en heeft dus ook geen rol");
      assert.ok(
        r.grond !== null && gronden.includes(r.grond),
        `'${String(r.grond)}' hoort een sleutel uit SYSTEEMGRONDEN te zijn (${gronden.join(", ")})`,
      );
      assert.ok(
        r.beleid_versie !== null && r.beleid_versie.length > 0,
        `fase ${String(r.fase)} hoort zijn mandaat te noemen; 0052 eist beleid_versie`,
      );
    }
    assert.deepEqual(
      vanDePoort.map((r) => r.grond),
      ["uitgifte:record", "uitgifte:pr"],
      "elke fase heeft zijn eigen grond; één grond voor alles zegt niets",
    );
  });

  /* ================================================================
     11 — de sessieweg en de machineweg kruisen elkaar niet
     ================================================================ */

  test("11 · een menselijk sessiekoekje opent /machine niet, en de sleutel opent /studio niet", async () => {
    const koekje = `intel_sessie=${maakSessieCookie(chef, org, 1)}`;

    /* EERST BEWIJZEN DAT HET KOEKJE ECHT GELDIG IS. Zonder deze meting
       zou een 401 op /machine ook kunnen betekenen dat het koekje
       verlopen of verkeerd gevormd is, en dan toetst de zaak niets. */
    const studio = await vraag("/studio", { sleutel: null, koekje });
    assert.equal(studio.status, 200, `het koekje van de beheerder hoort /studio te openen: ${studio.status}`);

    for (const r of ROUTES) {
      const a = await vraag(r.pad, {
        methode: r.methode,
        lichaam: r.lichaam,
        sleutel: null,
        koekje,
      });
      assert.equal(
        a.status,
        401,
        `${r.methode} ${r.pad} met een MENSELIJK koekje gaf ${a.status}; een sessiekoekje is ` +
          `geen machinesleutel`,
      );
    }

    /* EN DE OMGEKEERDE WEG. De machinesleutel is geen identiteit: op de
       menselijke kant is er geen sessie, dus /studio stuurt naar de
       inlogpagina. */
    const studioMetSleutel = await vraag("/studio");
    assert.ok(
      [302, 303].includes(studioMetSleutel.status),
      `/studio met alleen een machinesleutel gaf ${studioMetSleutel.status}; verwacht een redirect`,
    );
    assert.match(
      studioMetSleutel.locatie ?? "",
      /\/inloggen/,
      "een machinesleutel is geen sessie en hoort naar de inlogpagina te leiden",
    );
  });
});
