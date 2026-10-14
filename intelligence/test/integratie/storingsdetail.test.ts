/* ============================================================
   TEST — een FOUT op een storingssoort moet de WEIGERING noemen
   ------------------------------------------------------------
   WAAROM DIT BESTAAT — gemeten, niet bedacht.

   Op productie stond 14 oktober 2026 om 01:05Z:

     ingestie/storingssoort TOEGANG_BEPERKT=FOUT
       [1 bron(nen), waarvan 1 actief: rendo-nieuws]

   Daarmee weet je WELKE bron, en dat was de winst van de vorige release.
   Maar niet WELKE weigering. En dat is precies wat de handeling bepaalt:

     http=403         bot-bescherming of een IP-blokkade; officiële
                      toegang vragen, of de bron parkeren
     http=401         er is een sleutel nodig die wij niet hebben
     robots_verbod    de uitgever sluit ons uit; dan is parkeren het
                      enige juiste, en aankloppen zou fout zijn

   Drie verschillende weigeringen, drie verschillende besluiten, één
   signaalregel die ze niet onderscheidt. De enige uitweg was
   databasetoegang tot productie, en die bestaat met opzet niet.

   DE AANLEIDING MAAKT HET CONCREET. Van rendogroep.nl is gemeten dat
   robots.txt een LEGE Disallow heeft en dat de feed HTTP 200 met geldige
   RSS 2.0 geeft vanaf twee onafhankelijke uitgangen. De uitgever sluit
   ons dus niet uit — en toch stond de bron als TOEGANG_BEPERKT
   opgeschort. Of die classificatie klopt is zonder `storing_detail`
   niet vast te stellen, en een bron parkeren op een niet-vastgestelde
   grond zou een onware motivatie in het bronnenregister zetten.

   WAT DEZE TOETSEN VASTLEGGEN

     1 bij een FOUT staat het gemeten detail in de melding
     2 bij een AANVAARDE grens niet, want daar hoeft niemand iets
     3 alleen voor ACTIEVE bronnen
     4 de drie weigeringsvormen zijn in de melding te onderscheiden
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, describe, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { meetGezondheid } from "../../src/ops/gezondheid.ts";

/** Legt een bron met een gemeten storing neer. */
type Opzet = {
  readonly sleutel: string;
  readonly actief: boolean;
  readonly soort: string;
  readonly detail: string | null;
};

describe("de weigeringsvorm staat in de gezondheidsmelding", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  before(async () => {
    db = await maakWegwerpdatabase("storingsdetail");
    org = await maakOrganisatie(db, "storingsdetail");
  });

  after(async () => {
    await db?.opruimen();
  });

  async function bron(o: Opzet): Promise<void> {
    await alsEigenaar(db, async (c) => {
      await c.query(
        `insert into intel.bronnen
           (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
            betrouwbaarheid, is_primaire_bron, robots_status, tdm_status,
            verificatie_status, verificatie_bewijs, verificatie_op, toegestane_hosts,
            storingssoort, storing_sinds, storing_detail, ophalen_opgeschort_tot)
         values ($1,$2,$3,'rss',$4,$5,$6,4,true,
                 case when $6 then 'toegestaan' else 'toegestaan' end,
                 'geen_voorbehoud','geverifieerd','opzet voor een toets','2026-10-10',$7,
                 $8, '2026-10-12T19:04:00Z', $9, '2026-10-19T19:04:00Z')
         on conflict (organisatie_id, sleutel) do update
            set actief = excluded.actief,
                storingssoort = excluded.storingssoort,
                storing_detail = excluded.storing_detail`,
        [
          org,
          o.sleutel,
          `Uitgever ${o.sleutel}`,
          `https://${o.sleutel}.test/feed`,
          `https://${o.sleutel}.test`,
          o.actief,
          [`${o.sleutel}.test`],
          o.soort,
          o.detail,
        ],
      );
    });
  }

  /** De melding van het signaal voor één storingssoort. */
  async function meting(soort: string): Promise<string> {
    const signalen = await alsEigenaar(db, (c) => meetGezondheid(c as never, org));
    const s = signalen.find((x) => x.groep === "ingestie" && x.naam === `storingssoort ${soort}`);
    assert.ok(s, `geen signaal gevonden voor storingssoort ${soort}`);
    return `${s.niveau}|${s.meting}`;
  }

  test("1. een ACTIEVE toegangsbeperking is FOUT en noemt de gemeten weigering", async () => {
    await bron({
      sleutel: "weigert403",
      actief: true,
      soort: "TOEGANG_BEPERKT",
      detail: "http=403 robots=toegestaan tdm=geen_voorbehoud",
    });
    const m = await meting("TOEGANG_BEPERKT");
    assert.match(m, /^FOUT\|/, `een actieve beperking hoort FOUT te zijn: ${m}`);
    assert.match(m, /weigert403/, "de sleutel hoort erin te staan");
    assert.match(m, /http=403/, `de WEIGERINGSVORM hoort erin te staan, niet alleen de sleutel: ${m}`);
    assert.match(m, /opgeschort tot 2026-10-19/, "hoe lang hij stilstaat bepaalt of iemand kan wachten");
  });

  test("2. 401 en robots_verbod zijn in de melding te ONDERSCHEIDEN van 403", async () => {
    /* Dit is de hele reden dat het detail erin moet: drie weigeringen,
       drie besluiten. Zonder onderscheid is de melding niet uitvoerbaar. */
    await bron({
      sleutel: "weigert401",
      actief: true,
      soort: "NIET_GEAUTORISEERD",
      detail: "http=401 robots=toegestaan tdm=geen_voorbehoud",
    });
    const m401 = await meting("NIET_GEAUTORISEERD");
    assert.match(m401, /http=401/);

    await bron({
      sleutel: "robotsverbod",
      actief: true,
      soort: "TOEGANG_BEPERKT",
      detail: "fout=robots_verbod robots=verboden tdm=onbekend",
    });
    const m403 = await meting("TOEGANG_BEPERKT");
    assert.match(m403, /robots=verboden/, `een robotsverbod hoort als zodanig te lezen: ${m403}`);
    assert.notEqual(
      m401.includes("robots=verboden"),
      m403.includes("robots=verboden"),
      "de twee weigeringsvormen moeten aantoonbaar verschillende meldingen geven",
    );
  });

  test("3. een GEPARKEERDE beperking is LET OP en krijgt GEEN detail", async () => {
    /* Bij een aanvaarde grens hoeft niemand iets. Het detail zou de
       regel dan alleen langer maken zonder dat er een handeling
       tegenover staat. */
    const eigen = await maakWegwerpdatabase("storingsgeparkeerd");
    try {
      const o = await maakOrganisatie(eigen, "geparkeerd");
      await alsEigenaar(eigen, async (c) => {
        await c.query(
          `insert into intel.bronnen
             (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
              betrouwbaarheid, is_primaire_bron, robots_status, tdm_status,
              verificatie_status, verificatie_bewijs, verificatie_op, toegestane_hosts,
              storingssoort, storing_sinds, storing_detail)
           values ($1,'geparkeerd','Geparkeerd','rss','https://geparkeerd.test/feed',
                   'https://geparkeerd.test', false, 4, true, 'toegestaan','geen_voorbehoud',
                   'geverifieerd','opzet voor een toets','2026-10-10',$2,
                   'TOEGANG_BEPERKT','2026-10-12T19:04:00Z',
                   'http=403 dit detail hoort NIET in de melding te staan')`,
          [o, ["geparkeerd.test"]],
        );
      });
      const signalen = await alsEigenaar(eigen, (c) => meetGezondheid(c as never, o));
      const s = signalen.find((x) => x.naam === "storingssoort TOEGANG_BEPERKT");
      assert.ok(s);
      assert.equal(s.niveau, "LET OP", "een geparkeerde beperking is een bekende grens");
      assert.equal(s.aanvaard, true);
      assert.doesNotMatch(
        s.meting,
        /hoort NIET in de melding/,
        `een aanvaarde grens hoort geen detail te dragen: ${s.meting}`,
      );
    } finally {
      await eigen.opruimen();
    }
  });
});
