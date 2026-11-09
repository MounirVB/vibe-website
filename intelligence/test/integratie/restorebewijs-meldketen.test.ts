/* ============================================================
   TEST — het restorebewijssignaal en de vier toestandsovergangen
   ------------------------------------------------------------
   WAT HIER WORDT VASTGEZET, EN WAAROM HET EEN EIGEN BESTAND IS.

   `backup/restorebewijs leesbaar` kon FOUT melden en geen OK. Omdat
   ops/melden.ts een melding uitsluitend sluit op een GEMETEN OK — "een
   signaal dat verdwijnt sluit niets, want dan weten we het niet" — was
   dat een CRITICAL die nooit meer dichtging.

   GEMETEN OP 9 NOVEMBER 2026 IN PRODUCTIE. De melding stond op CRITICAL
   sinds 8 november 20:03 met als oorzaak `The billing account for the
   owning project is disabled in state delinquent`. Die facturatie was
   dezelfde dag hersteld, alle negen bewijsobjecten waren weer leesbaar
   en de gezondheidsronde meldde FOUT 0 — maar `laatst_gezien_op` van
   die melding bleef op 08:00:58 staan terwijl elke andere open melding
   om 11:03:20 opnieuw werd gezien.

   De vier overgangen uit de opdracht staan hieronder in de orde waarin
   ze in productie zijn voorgekomen, want die orde is zelf de val: een
   OK na een stille bron is iets anders dan een OK na een gemeten
   herstel.

   DRIE UITKOMSTEN EN EEN KETEN IN ÉÉN BESTAND, met opzet. De zuivere
   functie `restorebewijsSignaal()` wordt hier direct aangeroepen — die
   assertie heeft geen database nodig — en zijn uitkomst gaat daarna de
   echte meldketen in. Dat sluiten zit in SQL (een partiële unieke index
   plus een update op `gesloten_op`) en niet in applicatiecode, dus een
   losse eenheidstoets zou juist het stuk missen dat stuk was.

   MUTATIEBEWIJS. Met het oude gedrag teruggezet (nooit een OK) falen
   zaak 3, 5, 6 en 7, en blijven 1, 2, 2b en 4 groen.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";
import { maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { synchroniseerMeldingen } from "../../src/ops/melden.ts";
import { restorebewijsSignaal } from "../../src/ops/gezondheid.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";

const BUCKET = "vibe-energy-intel-backups";
const SLEUTEL = "backup/restorebewijs leesbaar";

/* De vier inventarisvormen, in de woorden van BucketInventaris. */
const GEZOND = { nieuwste: { uitslag: "PASS" }, gevonden: 9, nietOpgesomd: null, bedorven: [], afgekapt: 6 };
const BEDORVEN = {
  nieuwste: { uitslag: "PASS" },
  gevonden: 8,
  nietOpgesomd: null,
  bedorven: [
    "restoretest/2026-11-08T03-01-54Z-723527dc.json: niet op te halen (GCS-download mislukte (HTTP 403): " +
      "The billing account for the owning project is disabled in state delinquent)",
  ],
  afgekapt: 5,
};
const STIL = { nieuwste: null, gevonden: 0, nietOpgesomd: "de bucket gaf HTTP 503", bedorven: [], afgekapt: 0 };
const LEEG = { nieuwste: null, gevonden: 0, nietOpgesomd: null, bedorven: [], afgekapt: 0 };

describe("het restorebewijssignaal in de meldketen", () => {
  let db: Wegwerpdatabase;
  let organisatieId: number;

  before(async () => {
    db = await maakWegwerpdatabase("restorebewijs-meldketen");
    organisatieId = await maakOrganisatie(db, "vibe-energy");
  });

  after(async () => {
    await db?.opruimen();
  });

  /** Eén gezondheidsronde met precies deze signalen. */
  async function ronde(signalen: readonly (Signaal | null)[]) {
    return metOrganisatie(db.pool, { organisatieId }, (c) =>
      synchroniseerMeldingen(c, organisatieId, signalen.filter((s): s is Signaal => s !== null)),
    );
  }

  async function melding() {
    const r = await metOrganisatie(db.pool, { organisatieId }, (c) =>
      rijen<{
        id: number;
        niveau: string;
        gesloten_op: Date | null;
        keren_gezien: number;
        laatste_meting: string | null;
        laatste_advies: string | null;
      }>(
        c,
        `select id, niveau, gesloten_op, keren_gezien, laatste_meting, laatste_advies
           from intel.meldingen where organisatie_id = $1 and sleutel = $2 order by id`,
        [organisatieId, SLEUTEL],
      ),
    );
    return r;
  }

  test("1 · een bedorven bewijsobject OPENT een melding met de oorzaak erin", async () => {
    const s = restorebewijsSignaal(BUCKET, BEDORVEN);
    assert.ok(s, "een bedorven object hoort een signaal te geven");
    assert.equal(s.niveau, "FOUT");
    const uit = await ronde([s]);
    assert.equal(uit.geopend, 1, `verwacht één nieuwe melding, kreeg ${JSON.stringify(uit)}`);

    const [m] = await melding();
    assert.ok(m);
    assert.equal(m.gesloten_op, null, "hij hoort open te staan");
    assert.match(
      m.laatste_meting ?? "",
      /billing account/,
      "de oorzaak hoort in de melding te staan, niet alleen in het log",
    );
    assert.ok(m.laatste_advies, "een FOUT hoort een advies te dragen");
  });

  test("2 · FOUT -> ONBEKEND sluit NIET: een stille bron zegt niets", async () => {
    /* DIT IS DE BELANGRIJKSTE ZAAK. Een onbereikbare bucket mag een
       openstaande storing niet opruimen; dan zou een GCS-hik van dertig
       seconden een CRITICAL wegpoetsen zonder iets te hebben gemeten. */
    assert.equal(restorebewijsSignaal(BUCKET, STIL), null, "een stille bron geeft geen signaal");
    const uit = await ronde([restorebewijsSignaal(BUCKET, STIL)]);
    assert.equal(uit.gesloten, 0, "er mag niets sluiten op een bron die niets zegt");

    const [m] = await melding();
    assert.equal(m?.gesloten_op, null, "de melding staat nog steeds open");
  });

  test("2b · een LEGE bucket sluit ook niet: nul objecten is geen gezondheid", async () => {
    assert.equal(restorebewijsSignaal(BUCKET, LEEG), null, "zonder gelezen bewijs geen OK");
    const uit = await ronde([restorebewijsSignaal(BUCKET, LEEG)]);
    assert.equal(uit.gesloten, 0);
    const [m] = await melding();
    assert.equal(m?.gesloten_op, null);
  });

  test("3 · FOUT -> OK SLUIT, en de historische fouttekst blijft staan", async () => {
    const voor = (await melding())[0];
    assert.ok(voor && voor.gesloten_op === null, "voorwaarde: de melding van zaak 1 staat open");

    const s = restorebewijsSignaal(BUCKET, GEZOND);
    assert.ok(s);
    assert.equal(s.niveau, "OK");
    assert.match(s.meting, /waarvan 3 gelezen en alle 3 leesbaar/, `meting was: ${s.meting}`);
    assert.match(s.meting, /6 ouder\(e\) object\(en\) is niet opgehaald/, "de begrenzing hoort benoemd");
    assert.equal(s.advies, undefined, "een OK draagt geen advies");

    const uit = await ronde([s]);
    assert.equal(uit.gesloten, 1, `verwacht één sluiting, kreeg ${JSON.stringify(uit)}`);

    const [m] = await melding();
    assert.ok(m?.gesloten_op, "hij hoort nu gesloten te zijn");
    assert.equal(m.id, voor.id, "het is DEZELFDE rij; er wordt niets weggegooid");
    assert.match(
      m.laatste_meting ?? "",
      /billing account/,
      "het auditspoor blijft: de oorspronkelijke oorzaak staat er nog in",
    );
    assert.equal(m.niveau, "FOUT", "en het niveau van de storing blijft FOUT, want dat IS de historie");
  });

  test("4 · herhaalde OK verandert niets meer", async () => {
    const voor = await melding();
    const uit = await ronde([restorebewijsSignaal(BUCKET, GEZOND)]);
    assert.equal(uit.gesloten, 0, "een tweede OK sluit niets, want er staat niets open");
    assert.equal(uit.geopend, 0);
    const na = await melding();
    assert.equal(na.length, voor.length, "en er komt geen rij bij");
    assert.deepEqual(
      na.map((m) => m.gesloten_op?.toISOString()),
      voor.map((m) => m.gesloten_op?.toISOString()),
      "de sluittijd blijft de eerste sluittijd",
    );
  });

  test("5 · een TERUGKERENDE fout opent een NIEUWE melding naast de gesloten", async () => {
    /* De partiële unieke index staat op `where gesloten_op is null`, dus
       de gesloten rij staat de nieuwe niet in de weg. Dat is precies de
       bedoeling: twee storingen met een herstel ertussen zijn twee
       gebeurtenissen en geen herhaling. */
    const uit = await ronde([restorebewijsSignaal(BUCKET, BEDORVEN)]);
    assert.equal(uit.geopend, 1, `verwacht een NIEUWE melding, kreeg ${JSON.stringify(uit)}`);

    const alle = await melding();
    assert.equal(alle.length, 2, `verwacht twee rijen (een gesloten, een open), kreeg ${alle.length}`);
    const open = alle.filter((m) => m.gesloten_op === null);
    const dicht = alle.filter((m) => m.gesloten_op !== null);
    assert.equal(open.length, 1, "precies één open");
    assert.equal(dicht.length, 1, "en de vorige blijft dicht");
    assert.equal(open[0]?.keren_gezien, 1, "de nieuwe melding begint bij één");
  });

  test("6 · herhaalde FOUT dedupliceert in plaats van te stapelen", async () => {
    const uit = await ronde([restorebewijsSignaal(BUCKET, BEDORVEN)]);
    assert.equal(uit.geopend, 0, "dezelfde storing opent geen tweede melding");
    assert.equal(uit.bijgewerkt, 1);
    const open = (await melding()).filter((m) => m.gesloten_op === null);
    assert.equal(open.length, 1, "er blijft één open melding");
    assert.equal(open[0]?.keren_gezien, 2, "en de teller loopt op");
  });

  test("7 · en dan sluit hij weer, dus de keten is niet eenmalig", async () => {
    const uit = await ronde([restorebewijsSignaal(BUCKET, GEZOND)]);
    assert.equal(uit.gesloten, 1);
    const open = (await melding()).filter((m) => m.gesloten_op === null);
    assert.equal(open.length, 0, "niets staat meer open");
    assert.equal((await melding()).length, 2, "en beide gebeurtenissen blijven in de historie staan");
  });
});
