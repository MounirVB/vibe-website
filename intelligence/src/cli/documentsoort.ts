#!/usr/bin/env node
/* ============================================================
   CLI — documentclassificatie
   ------------------------------------------------------------
     npm run documentsoort                 classificeer wat nog geen
                                           of een verouderd oordeel heeft
     npm run documentsoort -- --droog      alleen rekenen en tonen
     npm run documentsoort -- --toon 20    de twintig onzekerste tonen
     npm run documentsoort -- --soort LOBBYDOCUMENT   alleen die soort

   DEZE CLI VERANDERT GEEN CLAIM EN GEEN KANDIDAAT. Hij schrijft
   uitsluitend de zes classificatiekolommen op brondocument_versies. Een
   herclassificatie verandert wat we van een document WETEN, niet wat er
   eerder mee is gebeurd — een claim die op de oude regels is bevestigd
   blijft staan tot de pijplijn hem opnieuw langs ziet komen. Dat is
   bewust: stil de geschiedenis herschrijven is erger dan een oordeel dat
   een ronde achterloopt.
   ============================================================ */

import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  classificeerVersie,
  haalClassificatieIn,
} from "../pijplijn/documentclassificatie.ts";
import { DOCUMENTSOORT_VERSIE } from "../pijplijn/documentsoort.ts";

laadEnvBestand();

const heeft = (n: string) => process.argv.includes(`--${n}`);
function argument(n: string): string | undefined {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

type Rij = {
  id: number;
  titel: string;
  ruwe_tekst: string;
  canonieke_url: string | null;
  bron_sleutel: string;
  injectie_verdacht: boolean;
};

async function main(): Promise<number> {
  configLezen();
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);
  const droog = heeft("droog");
  const toon = Number.parseInt(argument("toon") ?? "12", 10);
  const soortFilter = argument("soort");

  process.stdout.write(`DOCUMENTCLASSIFICATIE ${DOCUMENTSOORT_VERSIE}${droog ? " (DROOG)" : ""}\n\n`);

  if (!droog) {
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      haalClassificatieIn(c, organisatieId, { huidigeVersie: DOCUMENTSOORT_VERSIE }),
    );
    process.stdout.write(`  bekeken          ${r.bekeken}\n`);
    process.stdout.write(`  geclassificeerd  ${r.geclassificeerd}\n\n`);
  }

  /* De stand uit de database, niet uit deze ronde: dat is wat een
     redacteur wil zien. In droge stand wordt er niets geschreven, dus
     dan is dit de stand van vóór deze CLI. */
  const stand = await metOrganisatie(pool, { organisatieId }, (c) =>
    c.query<{ documentsoort: string | null; gezag: string | null; n: string }>(
      `select documentsoort, documentsoort_gezag as gezag, count(*)::text as n
         from intel.brondocument_versies
        where organisatie_id = $1
        group by 1, 2
        order by count(*) desc`,
      [organisatieId],
    ),
  );

  process.stdout.write("VERDELING OVER SOORT EN GEZAG\n");
  let totaal = 0;
  let zonder = 0;
  for (const r of stand.rows) {
    const n = Number(r.n);
    totaal += n;
    if (r.documentsoort === null) zonder += n;
    process.stdout.write(
      `  ${String(r.documentsoort ?? "(niet geclassificeerd)").padEnd(28)}` +
        `${String(r.gezag ?? "-").padEnd(20)}${String(n).padStart(6)}\n`,
    );
  }
  process.stdout.write(`  ${"TOTAAL".padEnd(48)}${String(totaal).padStart(6)}\n`);
  if (zonder > 0) {
    process.stdout.write(
      `  NOG TE DOEN: ${zonder} versie(s) zonder oordeel — draai zonder --droog\n`,
    );
  }
  process.stdout.write("\n");

  /* De onzekerste gevallen: dat is de werkvoorraad voor een mens. Een
     document met onzekerheid 0,40 is niet verkeerd geclassificeerd, maar
     het is het eerste waar een redacteur naar wil kijken. */
  const onzeker = await metOrganisatie(pool, { organisatieId }, (c) =>
    c.query<{
      titel: string;
      documentsoort: string;
      gezag: string;
      onzekerheid: string;
      besluit_van: string | null;
      uitleg: string | null;
    }>(
      `select v.titel, v.documentsoort, v.documentsoort_gezag as gezag,
              v.documentsoort_onzekerheid::text as onzekerheid,
              v.beschrijft_besluit_van as besluit_van,
              v.documentsoort_grondslag->>'uitleg' as uitleg
         from intel.brondocument_versies v
        where v.organisatie_id = $1
          and v.documentsoort is not null
          and ($2::text is null or v.documentsoort = $2)
        order by v.documentsoort_onzekerheid desc nulls last, v.id desc
        limit $3`,
      [organisatieId, soortFilter ?? null, Number.isFinite(toon) ? toon : 12],
    ),
  );

  process.stdout.write(
    soortFilter
      ? `SOORT ${soortFilter} — ${onzeker.rows.length} document(en)\n`
      : `ONZEKERSTE EERST — ${onzeker.rows.length} document(en)\n`,
  );
  if (onzeker.rows.length === 0) process.stdout.write("  (geen)\n");
  for (const r of onzeker.rows) {
    process.stdout.write(
      `\n  [${r.onzekerheid ?? "?"}] ${r.documentsoort} · ${r.gezag}` +
        (r.besluit_van ? ` · besluit van ${r.besluit_van}` : "") +
        "\n",
    );
    process.stdout.write(`        ${r.titel.slice(0, 96)}\n`);
    if (r.uitleg) process.stdout.write(`        ${r.uitleg.slice(0, 110)}\n`);
  }

  /* Een losse versie narekenen zonder iets te schrijven: handig als een
     redacteur een uitslag niet begrijpt. */
  const narekenen = argument("versie");
  if (narekenen) {
    const rij = await metOrganisatie(pool, { organisatieId }, (c) =>
      c.query<Rij>(
        `select v.id, v.titel, v.ruwe_tekst, d.canonieke_url,
                b.sleutel as bron_sleutel, v.injectie_verdacht
           from intel.brondocument_versies v
           join intel.brondocumenten d on d.id = v.brondocument_id
           join intel.bronnen b on b.id = d.bron_id
          where v.organisatie_id = $1 and v.id = $2`,
        [organisatieId, Number.parseInt(narekenen, 10)],
      ),
    );
    const v = rij.rows[0];
    if (!v) {
      process.stdout.write(`\nversie ${narekenen} niet gevonden\n`);
    } else {
      const u = classificeerVersie({
        versieId: v.id,
        titel: v.titel,
        tekst: v.ruwe_tekst,
        canoniekeUrl: v.canonieke_url,
        bronSleutel: v.bron_sleutel,
        injectieVerdacht: v.injectie_verdacht,
      });
      process.stdout.write(`\nNAREKENEN versie ${v.id}\n`);
      process.stdout.write(`  titel        ${v.titel.slice(0, 100)}\n`);
      process.stdout.write(`  soort        ${u.soort}\n`);
      process.stdout.write(`  gezag        ${u.gezag}\n`);
      process.stdout.write(`  onzekerheid  ${u.onzekerheid.toFixed(2)}\n`);
      process.stdout.write(`  besluit van  ${u.beschrijftBesluitVan ?? "-"}\n`);
      process.stdout.write(`  uitleg       ${u.grondslag.uitleg}\n`);
      for (const s of u.grondslag.signalen) process.stdout.write(`  signaal      ${s}\n`);
      for (const g of u.grondslag.geblokkeerd) process.stdout.write(`  GEBLOKKEERD  ${g}\n`);
    }
  }

  process.stdout.write("\nEr is niets gepubliceerd en niets goedgekeurd.\n");
  return 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`documentsoort mislukt: ${String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
