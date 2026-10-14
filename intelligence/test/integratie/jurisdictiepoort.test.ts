/* ============================================================
   TEST — waar geldt dit feit, en wat houdt een buitenlands feit tegen
   ------------------------------------------------------------
   HET GEMETEN DEFECT, LETTERLIJK

     bronzin: "De Belgische netbeheerder Fluvius verhoogt het nettarief
               in 2027 met 8%."
     uitslag: VERWOORDBAAR
     zin:     "Volgens Fluvius stijgt het nettarief voor de
               netbeheerders in 2027 met 8%."

   De verwoordbaarheidspoort had tien controles — getal, eenheid,
   fenomeen, subject, richting, tijd, bronrechten — en geen van de tien
   keek naar plaats, land of rechtsgebied. Het woord 'Belgische' matchte
   niets. Er kwam dus een publiceerbare NEDERLANDSE zin uit over een
   BELGISCH tarief, en de lezer kon dat aan de zin niet zien.

   DRIE GRENDELS, EN ZE DEKKEN ELK IETS ANDERS

     1 DE POORT (semantiek.ts) weigert de uitspraak verwoordbaar te
       maken. Dit is de plek waar het gebied wordt BEPAALD.
     2 DE DATABASE (migratie 0038) weigert VERWOORDBAAR zonder een
       gebied uit (NEDERLAND, EU). Ook een los script komt daar niet
       langs.
     3 DE ZESTIENDE POORT (poorten.ts) dekt de CONCEPTROUTE, die
       `verwoordbaar` niet leest. Die wordt getoetst in
       test/adversarieel/par32-vijfentwintig.test.ts, toets 12.

   EN EEN VIERDE, DIE EEN ÁNDER DEFECT REPAREERT
   vindCorrecties() matchte op fenomeen + subject + eenheid + nieuwere
   brondatum, zonder gebied. Daardoor kon een Belgisch nettarief een
   Nederlands nettarief als 'vervangen' markeren, waarna de poort op de
   NEDERLANDSE uitspraak VEROUDERD gaf. Het goede feit sneuvelde en het
   verkeerde bleef staan. Toets 5 legt dat vast.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { leesUitdrukkingen } from "../../src/pijplijn/uitdrukking.ts";
import { leidSemantiekAf, verwoordbaarheidspoort } from "../../src/pijplijn/semantiek.ts";
import { vindCorrecties } from "../../src/pijplijn/semantiekopslag.ts";

const BELGISCH = "De Belgische netbeheerder Fluvius verhoogt het nettarief in 2027 met 8%.";
const NEDERLANDS = "Netbeheerder Liander verhoogt het nettarief in Nederland in 2027 met 8%.";

/** De poort over één bronzin, zoals de pijplijn hem aanroept. */
function poort(zin: string, bron: { uitgever?: string | null; isPrimaireBron?: boolean } = {}) {
  const u = leesUitdrukkingen(zin)[0];
  assert.ok(u, `geen uitdrukking in: ${zin}`);
  const s = leidSemantiekAf(zin, u, bron);
  const p = verwoordbaarheidspoort({
    semantiek: s,
    uitdrukking: u,
    verificatieStatus: "bevestigd",
    bewijsKwaliteit: 5,
    heeftBewijs: true,
    vervangenDoor: null,
    dagenOud: 20,
    houdbaarheidDagen: 400,
    magCiteren: false,
    kanVerwoorden: () => true,
  });
  return { gebied: s.toepassingsgebied, uitslag: p.uitslag, reden: p.reden };
}

describe("de jurisdictiecontrole in de verwoordbaarheidspoort", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("jurisdictie");
    org = await maakOrganisatie(db, "jurisdictie");
  });

  after(async () => {
    await db?.opruimen();
  });

  test("1. de gemeten defectzin wordt NIET meer verwoordbaar", () => {
    const r = poort(BELGISCH);
    assert.equal(r.gebied, "BELGIE");
    assert.equal(r.uitslag, "BUITEN_TOEPASSINGSGEBIED", `uitslag was ${r.uitslag}: ${r.reden}`);
    assert.match(r.reden, /Belgi/, `de reden hoort Belgie te noemen: ${r.reden}`);
    assert.match(r.reden, /Fluvius/, "de reden hoort het gemeten signaal te noemen");
  });

  test("2. een NEDERLANDSE zin van dezelfde vorm komt er WEL door", () => {
    /* Zonder deze toets zou de controle alles kunnen blokkeren en nog
       steeds groen staan. Dan meet hij niets. */
    const r = poort(NEDERLANDS);
    assert.equal(r.gebied, "NEDERLAND");
    assert.equal(r.uitslag, "VERWOORDBAAR", `uitslag was ${r.uitslag}: ${r.reden}`);
  });

  test("3. een zin zonder gebiedssignaal wordt NIET stil Nederlands", () => {
    /* Het mechanisme waar het defect uit bestond: geen signaal werd als
       'dus over ons land' behandeld. Een leeg veld is geen bewijs. */
    const zonder = poort("Het nettarief stijgt in 2027 met 8%.");
    assert.equal(zonder.gebied, "ONBEKEND");
    assert.equal(zonder.uitslag, "BUITEN_TOEPASSINGSGEBIED");

    /* Met een Nederlandse autoriteit als PRIMAIRE uitgever mag het wel:
       dan legt de uitgever het rechtsgebied vast. */
    const met = poort("Het nettarief stijgt in 2027 met 8%.", {
      uitgever: "Autoriteit Consument & Markt",
      isPrimaireBron: true,
    });
    assert.equal(met.gebied, "NEDERLAND");
    assert.equal(met.uitslag, "VERWOORDBAAR", met.reden);
  });

  test("4. de DATABASE weigert VERWOORDBAAR met toepassingsgebied BELGIE", async () => {
    /* Grendel 2. De poort is code; dit is de regel waar ook een los
       script niet omheen komt. Migratie 0038, in de stijl van
       uitspraken_tijdgebonden_vraagt_tijd. */
    await assert.rejects(
      () =>
        alsEigenaar(db, (c) =>
          c.query(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, fenomeen, periode, toepassingsgebied,
                toepassingsgebied_grondslag, verwoordbaar, verwoordbaar_reden, verwoorde_zin)
             values ($1, $2, 'feit', 'nettarief', 'in 2027', 'BELGIE',
                     'de zin noemt Fluvius en Belgie', 'VERWOORDBAAR',
                     'een reden van ruim vijftien tekens',
                     'Volgens Fluvius stijgt het nettarief in 2027 met 8 procent.')`,
            [org, BELGISCH],
          ),
        ),
      (f: Error) => {
        assert.match(
          f.message,
          /toepassingsgebied|constraint|check/i,
          `een Belgisch feit hoort niet VERWOORDBAAR te kunnen zijn: ${f.message}`,
        );
        return true;
      },
    );

    /* En met NEDERLAND mag het wel, anders toetst de constraint niets. */
    await alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.uitspraken
           (organisatie_id, tekst, soort, fenomeen, periode, toepassingsgebied,
            toepassingsgebied_grondslag, verwoordbaar, verwoordbaar_reden, verwoorde_zin)
         values ($1, $2, 'feit', 'nettarief', 'in 2027', 'NEDERLAND',
                 'de zin noemt Liander en Nederland', 'VERWOORDBAAR',
                 'een reden van ruim vijftien tekens',
                 'Volgens Liander stijgt het nettarief in 2027 met 8 procent.')`,
        [org, NEDERLANDS],
      ),
    );
  });

  test("5. een BELGISCH tarief markeert een NEDERLANDS tarief niet als vervangen", async () => {
    /* Het tweede defect. Zelfde fenomeen, zelfde subject, zelfde
       eenheid, en de Belgische bron is NIEUWER. Zonder het gebied in de
       matchsleutel wordt de Nederlandse uitspraak 'vervangen' en geeft
       de poort er VEROUDERD op — het goede feit sneuvelt. */
    const eigen = await maakWegwerpdatabase("vindcorrecties");
    try {
      const o = await maakOrganisatie(eigen, "vindcorrecties");
      await alsEigenaar(eigen, async (c) => {
        /* EEN TRANSACTIE, want `uitspraken_bewijsplicht` is DEFERRABLE
           INITIALLY DEFERRED: een 'bevestigd'-uitspraak mag pas BIJ
           COMMIT een primaire bron hebben. Zonder expliciete transactie
           commit elke insert los en slaat de trigger toe op de uitspraak
           voordat zijn bronrij bestaat. */
        await c.query("begin");
        const b = await c.query<{ id: number }>(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              betrouwbaarheid, is_primaire_bron, robots_status, tdm_status,
              verificatie_status, verificatie_bewijs, verificatie_op, toegestane_hosts)
           values ($1,'tarieven','Tarievenbron','rss','https://tarieven.test/feed',
                   'https://tarieven.test',true,4,true,'toegestaan','geen_voorbehoud',
                   'geverifieerd','opzet voor een toets','2026-10-10',$2)
           returning id`,
          [o, ["tarieven.test"]],
        );
        /* Twee documenten met verschillende publicatiedatum: de
           Belgische is de NIEUWERE. */
        let i = 0;
        for (const [datum, gebied, grond] of [
          ["2026-01-01", "NEDERLAND", "de zin noemt Liander en Nederland"],
          ["2026-06-01", "BELGIE", "de zin noemt Fluvius en Belgie"],
        ] as const) {
          i += 1;
          const doc = await c.query<{ id: number }>(
            `insert into intel.brondocumenten
               (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort, gepubliceerd_op)
             values ($1,$2,$3,$4,'Tariefbericht','Tarievenbron','rss',$5) returning id`,
            [o, b.rows[0]!.id, `t-${i}`, `https://tarieven.test/n/${i}`, datum],
          );
          const ver = await c.query<{ id: number }>(
            `insert into intel.brondocument_versies
               (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst, tekst_lengte)
             values ($1,$2,1,$3,'Tariefbericht','De tekst.',9) returning id`,
            [o, doc.rows[0]!.id, `hash-${i}`],
          );
          const uit = await c.query<{ id: number }>(
            `insert into intel.uitspraken
               (organisatie_id, tekst, soort, fenomeen, subject, eenheid, waarde_numeriek,
                periode, verificatie_status, toepassingsgebied, toepassingsgebied_grondslag)
             values ($1,$2,'feit','nettarief','netbeheerder','%',8,'in 2027','bevestigd',$3,$4)
             returning id`,
            [o, `Tariefbericht ${i}`, gebied, grond],
          );
          await c.query(
            `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol, vindplaats)
             values ($1,$2,$3,'primair','tekenpositie 0')`,
            [o, uit.rows[0]!.id, ver.rows[0]!.id],
          );
        }
        await c.query("commit");
      });

      const r = await vindCorrecties(eigen.pool, o, { droog: true });
      assert.equal(
        r.bekeken,
        0,
        `een Belgisch tarief hoort geen Nederlands tarief te vervangen; gevonden: ` +
          JSON.stringify(r),
      );
    } finally {
      await eigen.opruimen();
    }
  });
});
