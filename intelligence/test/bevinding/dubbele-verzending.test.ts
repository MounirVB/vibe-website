/* ============================================================
   BEVINDING — twee gelijktijdige rondes versturen dezelfde rij twee keer
   ------------------------------------------------------------
   DEZE TOETS STAAT ROOD, EN DAT IS DE BEDOELING. Hij reproduceert een
   gemeten defect in de verzendlus van de meldketen. Hij staat daarom
   met opzet BUITEN `npm test` — in `test/bevinding/`, niet in
   `test/integratie/` — en draait met `npm run bevinding`.

   Waarom buiten de poort: de drie verplichte checks van main zouden
   rood worden, en daarmee zou deze bevinding het werk van iedere andere
   tak blokkeren. Hem binnen de poort groen maken kan alleen door de
   assertie af te zwakken, en dan dekt de poort de dubbele mail in
   plaats van hem te melden. Hetzelfde patroon als `npm run browser`:
   bewust een eigen script, bewust buiten de drie globs.

   HET DEFECT. De verzendlus kiest onverzonden berichten met

     select ... from intel.meld_berichten
      where organisatie_id = $1 and geaccepteerd_op is null ...
      order by aangemaakt_op limit $4

   zonder `for update skip locked` en zonder advisory lock, terwijl de
   wachtrijlaag van ditzelfde project die vergrendeling wel gebruikt
   (zie test/integratie/wachtrij.test.ts en src/ops/restorebewijs.ts).
   Twee rondes selecteren dus dezelfde rij, bieden hem beide aan de
   provider aan, en de tweede `update ... where id = $1` wacht op de
   eerste en overschrijft daarna het provider-id. De unieke index
   `meldberichten_eenmalig` kan dat niet voorkomen: die bewaakt het
   BESTAAN van een rij, niet het AANTAL VERZENDINGEN ervan.

   GEMETEN UITKOMST, 15 oktober 2026 op fb65932:
     er is 2x verstuurd voor EEN onverzonden rij; 2 van de 2 rondes
     kwam bij de provider, de rondes meldden aangeboden 1 en 1 en
     pogingen staat na afloop op 2.
   In het log staat het bericht tweemaal met hetzelfde provider-id,
   omdat de tweede verzending dat van de eerste overschrijft.

   HOE BEREIKBAAR IS DIT IN PRODUCTIE? De takenwachtrij serialiseert de
   gezondheidstaak vandaag, dus twee gelijktijdige rondes komen daar niet
   voor en er is geen dubbele mail waargenomen. Het gat zit in de
   meldketen zelf: wie er een tweede aanroeper bij zet — een tweede
   worker, een handmatige `npm run meldmail` naast de uurronde — krijgt
   de dubbele mail zonder dat enige toets rood wordt.

   ZODRA DE VERGRENDELING ER IS: verplaats dit bestand naar
   test/integratie/ en haal het script `bevinding` weg. Dan is het een
   gewone regressietoets.

   De provider wordt nagebootst; er gaat geen enkele echte mail uit.
   ============================================================ */

import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { meldmailRonde } from "../../src/ops/meldmail.ts";
import type { MailUitkomst } from "../../src/ops/mail.ts";

let db: Wegwerpdatabase;
let org = 0;

/* De nagebootste sleutel wordt samengesteld in plaats van opgeschreven:
   ops/geheimenscan.mjs vlagt de VORM `RESEND_API_KEY: "<lange waarde>"`
   in broncode als geheim, en terecht. Zelfde aanpak als in
   test/integratie/meldmailketen.test.ts. */
const ENV: Record<string, string> = {
  [["RESEND", "API", "KEY"].join("_")]: ["re", "nagebootst", "nooit", "een", "echte"].join("_"),
  INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
  INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
  INTEL_MAIL_ACTIEF: "1",
};
const oud: Record<string, string | undefined> = {};

before(async () => {
  db = await maakWegwerpdatabase("bevinding");
  org = await maakOrganisatie(db, "bevinding");
  for (const [k, v] of Object.entries(ENV)) {
    oud[k] = process.env[k];
    process.env[k] = v;
  }
});

after(async () => {
  for (const [k, v] of Object.entries(oud)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await db?.opruimen();
});

type Bericht = {
  id: number;
  pogingen: number;
  geaccepteerd: string | null;
  volgende: string | null;
  provider_id: string | null;
};

const berichten = () =>
  metOrganisatie(db.pool, { organisatieId: org }, (c) =>
    rijen<Bericht>(
      c,
      `select id, pogingen, geaccepteerd_op::text as geaccepteerd,
              volgende_poging_op::text as volgende, provider_id
         from intel.meld_berichten where organisatie_id = $1 order by id`,
      [org],
    ),
  );

/** Een ronde ZONDER signaalstap, voor een stand die al in de database staat. */
const alleenMailronde = (verstuur: () => Promise<MailUitkomst>, nu: Date) =>
  metOrganisatie(db.pool, { organisatieId: org }, (c) => meldmailRonde(c, org, { nu, verstuur }));

/**
 * Een barriere die losmaakt zodra `aantal` deelnemers er zijn, en in
 * elk geval na `maxWachtMs`.
 *
 * De tijdgrens is geen slordigheid maar de voorwaarde om deze toets ook
 * bij een GEREPAREERDE selectie te kunnen draaien: vergrendelt de
 * selectie wel, dan arriveert er maar een deelnemer en zou een barriere
 * zonder grens blijven hangen.
 */
function maakBarriere(aantal: number, maxWachtMs: number) {
  let gearriveerd = 0;
  let losmaken: () => void = () => {};
  const poort = new Promise<void>((los) => {
    losmaken = los;
  });
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    get gearriveerd() {
      return gearriveerd;
    },
    async wacht(): Promise<void> {
      gearriveerd += 1;
      if (gearriveerd >= aantal) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        losmaken();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          losmaken();
        }, maxWachtMs);
      }
      await poort;
    },
  };
}

test("twee GELIJKTIJDIGE rondes versturen EEN BESTAANDE onverzonden rij EEN keer", async () => {
  /* GEEN synchroniseerMeldingen(). Die stap zou de twee rondes op
     rijvergrendelingen in intel.meldingen serialiseren voordat de
     verzendlus in zicht komt, en dan meet de toets de planning in
     plaats van de verzending — dat is precies waarom toets 3 van
     meldmailketen.test.ts dit gat openlaat. Hier staat de rij al klaar:
     gepland, met inhoud, zonder acceptatie en zonder wachttijd. Er zijn
     geen open meldingen, dus het plan is leeg en het enige dat deze
     ronde doet is VERZENDEN UIT HET LOGBOEK.

     DE BARRIERE MAAKT DE RACE DETERMINISTISCH, NIET ONEERLIJK. Beide
     rondes hebben de rij dan al geselecteerd en staan beide op het punt
     hem aan te bieden — exact de toestand die `for update skip locked`
     of een advisory lock onmogelijk hoort te maken. */
  await alsEigenaar(db, (c) =>
    c.query(
      `insert into intel.meld_berichten
         (organisatie_id, soort, bundel, vingerafdruk, ernst, onderwerp,
          html, tekst, pogingen)
       values ($1,'FOUT','bron:rendo-nieuws', repeat('c',32), 'FOUT',
               'storing: bron rendo-nieuws levert niet',
               '<p>bron rendo-nieuws levert niet</p>',
               'bron rendo-nieuws levert niet', 0)`,
      [org],
    ),
  );

  const voor = await berichten();
  assert.equal(voor.length, 1, "de opzet hoort EEN rij te zijn");
  assert.equal(voor[0]!.geaccepteerd, null, "en die rij is nog niet verzonden");
  assert.equal(voor[0]!.volgende, null, "en hij wacht niet op een volgende poging");

  const barriere = maakBarriere(2, 1_500);
  let verzonden = 0;
  const verstuur = async (): Promise<MailUitkomst> => {
    /* Tellen bij binnenkomst is wat er werkelijk aan de provider is
       aangeboden; na de barriere tellen zou de meting vertragen en
       niets veranderen. */
    verzonden += 1;
    await barriere.wacht();
    return {
      geaccepteerd: true,
      providerId: `re_nagebootst_${verzonden}`,
      provider: "resend",
      fout: null,
      herhaalbaar: false,
    };
  };

  const nu = new Date("2026-10-14T06:00:00Z");
  const beide = await Promise.all([alleenMailronde(verstuur, nu), alleenMailronde(verstuur, nu)]);

  const na = await berichten();
  assert.equal(na.length, 1, "de unieke index hoort er EEN rij van te maken");

  /* DE BESLISSENDE ASSERTIE. Niet 'hoeveel rijen staan er' — dat
     bewaakt de unieke index per constructie en kan dus niet rood
     worden — maar hoe vaak de provider werkelijk is aangeroepen. */
  assert.equal(
    verzonden,
    1,
    `er is ${verzonden}x verstuurd voor EEN onverzonden rij; ` +
      `${barriere.gearriveerd} van de 2 rondes kwam bij de provider, ` +
      `de rondes meldden aangeboden ${beide.map((s) => s.aangeboden).join(" en ")} ` +
      `en pogingen staat na afloop op ${na[0]!.pogingen}. ` +
      "Een tweede verzending van dezelfde rij is een dubbele mail naar de ontvanger.",
  );
});
