/* ============================================================
   INTEGRATIE — de Search Console-koppeling
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, en waarom elk van deze zaken een eigen
   faalwijze afdekt die eerder in dit platform écht is voorgekomen.

   1 DE PROPERTY WORDT NOOIT GERADEN. Drie documenten in deze repository
     spraken elkaar tegen over het propertytype. kiesProperty() lost dat
     niet op door te kiezen maar door te WEIGEREN zodra er iets te kiezen
     valt.

   2 ONTBREKENDE DATA IS GEEN NUL. Dit is de eis die de hele
     dekkingstabel rechtvaardigt. Een geblokkeerde synchronisatie mag
     GEEN dekkingsrij schrijven, want een dekkingsrij met nul rijen
     beweert dat de periode is opgehaald en leeg was.

   3 HTTP 200 IS GEEN INDEXATIE. De eigen live-meting schrijft met bron
     'eigen_meting' en `geindexeerd = 'onbekend'`; alleen een
     GSC-waarneming mag 'ja' of 'nee' zetten. De twee staan als APARTE
     rijen naast elkaar, want de unieke sleutel bevat de bron.

   4 DE POSITIETELLER IS NUL-GEBASEERD. De view rekent
     sum(positie_som)/sum(impressies) + 1, en GSC levert 1-gebaseerd.
     Eén keer verkeerd omrekenen levert een gemiddelde positie die er een
     hele plek naast zit, en dat is aan het getal niet te zien. Deze
     zaak rekent de rondgang na.

   5 DE CONVENTIE WORDT GEMETEN. Niet aangenomen, ook niet als de API hem
     documenteert.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import {
  maakOrganisatie,
  maakWegwerpdatabase,
  alsEigenaar,
  type Wegwerpdatabase,
} from "../harnas.ts";
import { metOrganisatie } from "../../src/kern/db.ts";
import {
  GSC_BRON,
  gscStand,
  kiesProperty,
  meetConventie,
  propertySoort,
  synchroniseerGsc,
  type Property,
} from "../../src/analytics/gsc.ts";

const DOMEIN: Property = {
  siteUrl: "sc-domain:vibeenergy.nl",
  machtiging: "siteOwner",
  soort: "domein",
};
const PREFIX: Property = {
  siteUrl: "https://www.vibeenergy.nl/",
  machtiging: "siteOwner",
  soort: "url_prefix",
};

describe("de Search Console-koppeling", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("gsc");
    org = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db?.opruimen();
  });

  /* ---------- 1 · de property wordt niet geraden ---------- */

  test("1 · twee properties zonder voorkeur geeft ONBESLIST, niet 'de eerste'", () => {
    const k = kiesProperty([DOMEIN, PREFIX], null);
    assert.equal(k.soort, "onbeslist");
    if (k.soort === "onbeslist") {
      /* DE LIJST MOET IN DE REDEN STAAN. Een weigering zonder de
         beschikbare opties is voor een eigenaar niet op te lossen. */
      assert.match(k.reden, /sc-domain:vibeenergy\.nl/);
      assert.match(k.reden, /https:\/\/www\.vibeenergy\.nl\//);
      assert.match(k.reden, /INTEL_GSC_SITE_URL/);
    }
  });

  test("1b · een voorkeur die BESTAAT wordt gekozen, met de grond erbij", () => {
    const k = kiesProperty([DOMEIN, PREFIX], "sc-domain:vibeenergy.nl");
    assert.equal(k.soort, "gekozen");
    if (k.soort === "gekozen") {
      assert.equal(k.property.siteUrl, "sc-domain:vibeenergy.nl");
      assert.equal(k.property.soort, "domein");
      assert.match(k.grond, /INTEL_GSC_SITE_URL/);
    }
  });

  test("1c · een voorkeur die NIET bestaat valt niet stil terug op een andere", () => {
    /* DIT IS DE GEVAARLIJKSTE VARIANT. Een manifest dat op de ene vorm
       staat terwijl de andere bestaat, zou met een terugval een
       dashboard vullen met cijfers van de verkeerde property — en dat
       ziet er volkomen normaal uit. */
    const k = kiesProperty([DOMEIN], "https://www.vibeenergy.nl/");
    assert.equal(k.soort, "onbeslist");
    if (k.soort === "onbeslist") {
      assert.match(k.reden, /bestaat niet voor deze identiteit/);
      assert.match(k.reden, /meten verschillende dingen/);
    }
  });

  test("1d · precies één property is geen keuze en wordt genomen", () => {
    const k = kiesProperty([PREFIX], null);
    assert.equal(k.soort, "gekozen");
    if (k.soort === "gekozen") assert.match(k.grond, /precies één property/);
  });

  test("1e · het propertytype komt uit de VORM, niet uit een aanname", () => {
    assert.equal(propertySoort("sc-domain:vibeenergy.nl"), "domein");
    assert.equal(propertySoort("https://www.vibeenergy.nl/"), "url_prefix");
    assert.equal(propertySoort("http://vibeenergy.nl/"), "url_prefix");
  });

  /* ---------- 2 · ontbrekende data is geen nul ---------- */

  test("2 · een geblokkeerde synchronisatie schrijft GEEN dekkingsrij", async () => {
    /* ZONDER CREDENTIAL. Dat is de goedkoopste blokkade om af te dwingen
       en hij dekt de regel voor alle vier de fasen: de module keert terug
       met {soort:"geblokkeerd"} vóórdat er iets wordt geschreven. */
    const bewaard = {
      email: process.env["INTEL_GSC_CLIENT_EMAIL"],
      key: process.env["INTEL_GSC_PRIVATE_KEY"],
      gcs: process.env["INTEL_GCS_SLEUTEL"],
    };
    delete process.env["INTEL_GSC_CLIENT_EMAIL"];
    delete process.env["INTEL_GSC_PRIVATE_KEY"];
    delete process.env["INTEL_GCS_SLEUTEL"];
    try {
      const uit = await synchroniseerGsc(db.pool, org, { dagen: 7 });
      assert.equal(uit.soort, "geblokkeerd", "zonder credential hoort hij te weigeren");
      if (uit.soort === "geblokkeerd") {
        assert.equal(uit.fase, "credential");
        /* DE REDEN MOET DE VARIABELEN NOEMEN, anders is hij niet op te
           lossen door wie hem leest. */
        assert.match(uit.reden, /INTEL_GSC_CLIENT_EMAIL|INTEL_GCS_SLEUTEL/);
      }
    } finally {
      if (bewaard.email !== undefined) process.env["INTEL_GSC_CLIENT_EMAIL"] = bewaard.email;
      if (bewaard.key !== undefined) process.env["INTEL_GSC_PRIVATE_KEY"] = bewaard.key;
      if (bewaard.gcs !== undefined) process.env["INTEL_GCS_SLEUTEL"] = bewaard.gcs;
    }

    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) => gscStand(c, org));
    assert.equal(stand.dekkingsrijen, 0, "een blokkade mag geen dekkingsvenster achterlaten");
    assert.equal(stand.zoekvraagrijen, 0);
    assert.equal(
      stand.nieuwsteDatum,
      null,
      "en al helemaal geen datum, want er is niets gemeten",
    );
  });

  test("2b · NUL DEKKINGSRIJEN en 'nul vertoningen' zijn verschillende uitkomsten", async () => {
    /* HET ONDERSCHEID, hard gemaakt. Na deze zaak staat er één
       dekkingsvenster met aantal_rijen = 0: dat betekent 'opgehaald en
       leeg'. Dat is iets heel anders dan geen venster, wat 'nooit
       opgehaald' betekent. Zonder dit onderscheid is elke nul een
       vermoeden. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.analytics_dekking
           (organisatie_id, bron, datum_vanaf, datum_tot, aantal_rijen, afgekapt, volledig, opmerking)
         values ($1,$2,'2026-10-01','2026-10-07',0,false,true,'opgehaald en werkelijk leeg')`,
        [org, GSC_BRON],
      );
    });
    const stand = await metOrganisatie(db.pool, { organisatieId: org }, (c) => gscStand(c, org));
    assert.equal(stand.dekkingsrijen, 1, "er is nu WEL een venster");
    assert.equal(stand.zoekvraagrijen, 0, "en nul zoekvraagrijen daarbinnen");
    /* Dat is de leesbare uitkomst 'nul vertoningen in die week', en die
       mag een dashboard tonen. De vorige zaak mocht dat niet. */
  });

  test("2c · een AUTORISATIEblokkade is geen taakfout, een STORING wel", async () => {
    /* DE FOUT DIE IK EERST MAAKTE, en de reden dat deze zaak bestaat.
       Mijn eerste plannerhandler gooide op ELKE blokkade met
       herhaalbaar:false. Zo'n fout gaat in dit platform RECHTSTREEKS
       naar de DLQ (wachtrij.ts: naarDlq = opgebruikt || !herhaalbaar).
       De taak is DAGELIJKS en de Search Console-API staat uit in
       afwachting van een handeling van de eigenaar -- dus elke dag een
       nieuwe DLQ-rij, en het DLQ-signaal dat in dezelfde ronde op FOUT
       is gezet zou daar permanent rood op staan. Een zelfgemaakt vals
       alarm over een bekende grens.

       Deze zaak zet de SCHEIDING vast op de vier fasen die op een mens
       wachten. De module levert ze als `geblokkeerd` met een fase, en
       de handler mag daar niet op gooien. */
    const wachtOpMens = ["credential", "api_uit", "propertytoegang", "propertykeuze"];
    const bron = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../../src/kern/taken.ts", import.meta.url), "utf8"),
    );
    const zonderCommentaar = bron.replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const fase of wachtOpMens) {
      assert.ok(
        zonderCommentaar.includes(`uit.fase === "${fase}"`),
        `fase '${fase}' hoort in de wachtOpMens-tak van de gsc-handler te staan; zonder dat ` +
          `levert hij dagelijks een DLQ-rij op voor een bekende grens`,
      );
    }
    /* EN DE ANDERE KANT: een echte storing moet WEL gooien, en
       herhaalbaar zijn. Een geweigerd token of een 5xx is iets dat stuk
       is en hoort in de wachtrij. */
    assert.ok(
      /herhaalbaar: true/.test(zonderCommentaar),
      "een echte storing hoort als herhaalbare fout te gooien",
    );
    assert.ok(
      !/herhaalbaar: false[\s\S]{0,400}GSC-synchronisatie/.test(zonderCommentaar),
      "de gsc-handler mag niet meer met herhaalbaar:false gooien",
    );
  });

  /* ---------- 3 · HTTP 200 is geen indexatie ---------- */

  test("3 · een eigen meting met HTTP 200 laat de indexatie ONBEKEND", async () => {
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.indexatie_status
           (organisatie_id, url, in_sitemap, geindexeerd, bron, http_status, bewijs)
         values ($1,'https://www.vibeenergy.nl/nieuws/x',true,'onbekend','eigen_meting',200,
                 'LET OP: dit is bereikbaarheid, niet indexatie')`,
        [org],
      );
    });
    const rij = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ geindexeerd: string; bron: string; http_status: number }>(
        "select geindexeerd, bron, http_status from intel.indexatie_status where organisatie_id = $1",
        [org],
      );
      return r.rows[0]!;
    });
    assert.equal(rij.http_status, 200, "aanname: de pagina is bereikbaar");
    assert.equal(
      rij.geindexeerd,
      "onbekend",
      "HTTP 200 mag NOOIT als Google-indexering gelden; dat is een aparte waarneming",
    );
    assert.equal(rij.bron, "eigen_meting");
  });

  test("3b · een GSC-waarneming staat NAAST de eigen meting, niet in plaats van", async () => {
    /* DE UNIEKE SLEUTEL BEVAT DE BRON, en dat is het hele ontwerp: de
       twee waarnemingen over dezelfde URL leven naast elkaar. Zou de
       sleutel alleen de URL zijn, dan zou een eigen meting een
       GSC-waarneming overschrijven met 'onbekend' — en dan zou het
       systeem indexatie VERLIEZEN door naar zijn eigen site te kijken. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.indexatie_status
           (organisatie_id, url, in_sitemap, geindexeerd, bron, http_status, bewijs)
         values ($1,'https://www.vibeenergy.nl/nieuws/x',true,'ja','gsc',null,
                 'GSC meldt deze URL als opgenomen')`,
        [org],
      );
    });
    const rijen = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ bron: string; geindexeerd: string }>(
        `select bron, geindexeerd from intel.indexatie_status
          where organisatie_id = $1 and url = 'https://www.vibeenergy.nl/nieuws/x'
          order by bron`,
        [org],
      );
      return r.rows;
    });
    assert.equal(rijen.length, 2, "beide waarnemingen horen te bestaan");
    assert.deepEqual(
      rijen.map((r) => `${r.bron}=${r.geindexeerd}`),
      ["eigen_meting=onbekend", "gsc=ja"],
      "de eigen meting blijft 'onbekend' en alleen GSC zegt 'ja'",
    );
  });

  /* ---------- 4 · de positieteller is nul-gebaseerd ---------- */

  test("4 · de positie rekent heen en terug zonder een plek te verschuiven", async () => {
    /* GSC geeft positie 3,0 bij 100 vertoningen. De teller in de tabel is
       NUL-gebaseerd, dus (3 - 1) * 100 = 200. De view doet
       sum(positie_som)/sum(impressies) + 1 = 200/100 + 1 = 3. Terug op
       de oorspronkelijke 3,0.

       Zou de teller 1-gebaseerd worden opgeslagen (300), dan gaf de view
       4,0 — een hele plek te laag, en niemand ziet dat aan het getal. */
    await alsEigenaar(db, async (c) => {
      await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
      await c.query(
        `insert into intel.zoekvraag_metingen
           (organisatie_id, bron, datum, zoekvraag, pagina_pad, land, apparaat,
            impressies, kliks, ctr, gemiddelde_positie, positie_som, positie_conventie)
         values ($1,$2,'2026-10-20','netcongestie bedrijf','/nieuws/x','nld','DESKTOP',
                 100, 5, 0.05, 3.0, (3.0 - 1) * 100, 'een_gebaseerd')`,
        [org, GSC_BRON],
      );
    });
    const uit = await metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      const r = await c.query<{ gemiddelde_positie: string; impressies: string; kliks: string; ctr: string }>(
        `select gemiddelde_positie::text, impressies::text, kliks::text, ctr::text
           from intel.zoekvraag_per_vraag
          where organisatie_id = $1 and zoekvraag = 'netcongestie bedrijf'`,
        [org],
      );
      return r.rows[0]!;
    });
    assert.equal(Number(uit.gemiddelde_positie), 3, "de view hoort op 3,0 uit te komen");
    assert.equal(Number(uit.impressies), 100);
    assert.equal(Number(uit.kliks), 5);
    assert.equal(Number(uit.ctr), 0.05);
  });

  test("4b · de constraints weigeren een onmogelijke waarneming", async () => {
    /* Twee contractregels uit migratie 0009, en ze horen te vuren:
       impressies >= 1, en kliks nooit boven impressies. De adapter
       filtert ze er zelf uit, maar een toets op het CONTRACT is sterker
       dan een toets op de filter. */
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.zoekvraag_metingen
               (organisatie_id, bron, datum, zoekvraag, impressies, kliks)
             values ($1,$2,'2026-10-21','nul vertoningen',0,0)`,
            [org, GSC_BRON],
          );
        }),
      /impressies_minimaal_een/,
    );
    await assert.rejects(
      () =>
        alsEigenaar(db, async (c) => {
          await c.query("select set_config('app.organisatie_id', $1, false)", [String(org)]);
          await c.query(
            `insert into intel.zoekvraag_metingen
               (organisatie_id, bron, datum, zoekvraag, impressies, kliks)
             values ($1,$2,'2026-10-21','meer kliks dan vertoningen',5,9)`,
            [org, GSC_BRON],
          );
        }),
      /kliks_niet_boven_impressies/,
    );
  });

  /* ---------- 5 · de conventie wordt gemeten ---------- */

  test("5 · de positieconventie komt uit de respons en niet uit de documentatie", () => {
    assert.equal(meetConventie([]), "onbekend", "zonder rijen is er niets gemeten");
    assert.equal(
      meetConventie([{ positie: 3.4 } as never]),
      "een_gebaseerd",
      "alle posities >= 1 past bij de 1-gebaseerde conventie",
    );
    assert.equal(
      meetConventie([{ positie: 3.4 } as never, { positie: 0.8 } as never]),
      "nul_gebaseerd",
      "één positie onder 1 sluit de 1-gebaseerde conventie uit",
    );
    /* EN EEN POSITIE VAN EXACT 0 TELT NIET MEE: GSC laat het veld weg bij
       een rij zonder positie, en onze parser maakt daar 0 van. Dat is
       geen meting van een conventie maar een ontbrekende waarde. */
    assert.equal(meetConventie([{ positie: 0 } as never]), "onbekend");
  });
});
