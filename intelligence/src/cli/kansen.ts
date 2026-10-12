#!/usr/bin/env node
/* ============================================================
   CLI — kansen
   ------------------------------------------------------------
     npm run kansen                bouw kansen uit geclassificeerde
                                   gebeurtenissen en sla ze op
     npm run kansen -- --toon      de werkvoorraad tonen
     npm run kansen -- --dossier 3 één dossier volledig uitschrijven
     npm run kansen -- --vandaag 2026-10-12   de peildatum vastzetten

   De peildatum staat als vlag zodat urgentie reproduceerbaar is; zonder
   vlag is het vandaag.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { bouwKansen } from "../commercieel/bouwkansen.ts";
import { leesWerkvoorraad } from "../commercieel/kansenopslag.ts";
import { FASE_LABEL, type Fase } from "../commercieel/aanbesteding.ts";
import { STATUS_LABEL, type Status } from "../commercieel/kansen.ts";

function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const uit = (s: string) => process.stdout.write(s);

async function toonWerkvoorraad(pool: ReturnType<typeof maakPool>, org: number): Promise<void> {
  const werk = await leesWerkvoorraad(pool, org, 50);
  uit(`WERKVOORRAAD — ${werk.length} openstaande kans(en)\n`);
  uit("Eindstanden (gegund, beëindigd, afgewezen) staan hier bewust niet in.\n\n");
  for (const w of werk) {
    uit(`[${w.id}] ${w.opdrachtgever}\n`);
    uit(`     ${w.project.slice(0, 70)}\n`);
    uit(
      `     ${w.fase_label} · ${w.status_label} · ` +
        `sluit ${w.sluit_op ?? "ONBEKEND"} · ${w.aantal_publicaties} publicatie(s)\n`,
    );
    uit(
      `     relevantie ${w.score_relevantie}  vertrouwen ${w.score_vertrouwen}  ` +
        `urgentie ${w.score_urgentie}  handelbaar ${w.score_handelbaar}\n`,
    );
    if (w.ontbrekend.length > 0) uit(`     ONBEKEND: ${w.ontbrekend.join(", ")}\n`);
    if (w.aanbevolen_actie) uit(`     ACTIE: ${w.aanbevolen_actie}\n`);
    uit("\n");
  }
  if (werk.length === 0) uit("(geen openstaande kansen)\n");
}

type DossierRij = {
  opdrachtgever: string;
  project: string;
  fase: string | null;
  status: string;
  sluit_op: string | null;
  referentie: string | null;
  procedure_soort: string | null;
  procedure_status: string | null;
  opdracht_omvang: string | null;
  relevante_oplossingen: string[];
  ontbrekend: string[];
  aanbevolen_actie: string | null;
  fase_grondslag: string[];
  identiteit: string | null;
  identiteit_grondslag: string | null;
  score_relevantie: number;
  score_vertrouwen: number;
  score_urgentie: number;
  score_handelbaar: number;
  score_grondslag: Record<string, { score: number; reden: string }>;
};

async function toonDossier(
  pool: ReturnType<typeof maakPool>,
  org: number,
  id: string,
): Promise<number> {
  const k = await metOrganisatie(pool, { organisatieId: org }, (c) =>
    rijen<DossierRij>(
      c,
      `select opdrachtgever, project, fase, status, sluit_op::text, referentie,
              procedure_soort, procedure_status, opdracht_omvang, relevante_oplossingen,
              ontbrekend, aanbevolen_actie, fase_grondslag, identiteit, identiteit_grondslag,
              score_relevantie, score_vertrouwen, score_urgentie, score_handelbaar,
              score_grondslag
         from intel.kansen where organisatie_id = $1 and id = $2`,
      [org, id],
    ),
  );
  const d = k[0];
  if (!d) {
    process.stderr.write(`geen kans met id ${id}\n`);
    return 1;
  }
  const pubs = await metOrganisatie(pool, { organisatieId: org }, (c) =>
    rijen<{
      url: string;
      gepubliceerd_op: string | null;
      publicatie_soort: string | null;
      relatie: string;
      relatie_grondslag: string | null;
      sluitingsdatum_bron: string | null;
    }>(
      c,
      `select url, gepubliceerd_op::text, publicatie_soort, relatie, relatie_grondslag,
              sluitingsdatum_bron::text
         from intel.kans_publicaties
        where organisatie_id = $1 and kans_id = $2
        order by gepubliceerd_op`,
      [org, id],
    ),
  );

  const onbekend = (v: string | null) => v ?? "ONBEKEND";
  uit(`DOSSIER ${id}\n${"=".repeat(74)}\n\n`);
  uit(`FEITEN — wat de bron zelf meldt\n`);
  uit(`  opdrachtgever     ${d.opdrachtgever}\n`);
  uit(`  project           ${d.project}\n`);
  uit(`  kenmerk           ${onbekend(d.referentie)}\n`);
  uit(`  procedure         ${onbekend(d.procedure_soort)}\n`);
  uit(`  fase              ${d.fase ? (FASE_LABEL[d.fase as Fase] ?? d.fase) : "ONBEKEND"}\n`);
  uit(`  sluit op          ${onbekend(d.sluit_op)}\n`);
  uit(`  omvang            ${onbekend(d.opdracht_omvang)}\n\n`);

  uit(`WAT NIET BEKEND IS — ${d.ontbrekend.length} veld(en)\n`);
  for (const o of d.ontbrekend) uit(`  - ${o}\n`);
  if (d.ontbrekend.length === 0) uit("  (niets)\n");
  uit("\n");

  uit(`GEVOLGTREKKINGEN — onze inschatting, met grondslag\n`);
  for (const as of ["relevantie", "vertrouwen", "urgentie", "handelbaar"] as const) {
    const g = d.score_grondslag[as];
    uit(`  ${as.padEnd(11)} ${String(g?.score ?? "?").padStart(3)}  ${g?.reden ?? "(geen reden)"}\n`);
  }
  uit(`  oplossingen       ${d.relevante_oplossingen.join(", ") || "ONBEKEND"}\n\n`);

  uit(`PUBLICATIES — ${pubs.length}\n`);
  uit(`  samengenomen op: ${d.identiteit_grondslag ?? d.identiteit ?? "ONBEKEND"}\n`);
  for (const p of pubs) {
    uit(`  ${p.gepubliceerd_op ?? "????-??-??"}  ${p.publicatie_soort ?? "???"}  ${p.relatie}\n`);
    uit(`     ${p.url}\n`);
    if (p.sluitingsdatum_bron) uit(`     gemelde sluitingsdatum: ${p.sluitingsdatum_bron}\n`);
    if (p.relatie_grondslag) uit(`     grondslag: ${p.relatie_grondslag}\n`);
  }
  uit("\n");

  uit(`FASEGRONDSLAG\n`);
  for (const g of d.fase_grondslag) uit(`  - ${g}\n`);
  uit("\n");

  uit(`AANBEVELING (status ${STATUS_LABEL[d.status as Status] ?? d.status})\n`);
  uit(`  ${d.aanbevolen_actie ?? "(geen)"}\n`);
  uit(`\nDeze aanbeveling gaat nooit over het benaderen van een organisatie.\n`);
  uit(`Externe benadering vraagt een apart menselijk besluit.\n`);
  return 0;
}

async function main(): Promise<number> {
  const pool = maakPool();
  const organisatieId = await huidigeOrganisatie(pool);

  const dossier = argument("dossier");
  if (dossier) return toonDossier(pool, organisatieId, dossier);
  if (process.argv.includes("--toon")) {
    await toonWerkvoorraad(pool, organisatieId);
    return 0;
  }

  const vandaag = argument("vandaag") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vandaag)) {
    process.stderr.write(`--vandaag moet een ISO-datum zijn, kreeg '${vandaag}'\n`);
    return 1;
  }

  const r = await bouwKansen(pool, organisatieId, { vandaag });
  uit(`KANSEN BOUWEN — peildatum ${vandaag}\n\n`);
  uit(`publicaties bekeken      ${r.publicaties}\n`);
  uit(`onderscheiden kansen     ${r.kansen}\n`);
  if (r.publicaties > r.kansen) {
    uit(
      `  -> ${r.publicaties - r.kansen} publicatie(s) bleken een latere fase van een ` +
        `aanbesteding die er al stond\n`,
    );
  }
  uit(`\nnieuw                    ${r.opslag.nieuw}\n`);
  uit(`bijgewerkt               ${r.opslag.bijgewerkt}\n`);
  uit(`status behouden (mens)   ${r.opslag.statusBehouden}\n`);
  uit(`publicaties vastgelegd   ${r.opslag.publicatiesToegevoegd}\n`);
  uit(`mislukt                  ${r.opslag.mislukt}\n`);
  uit(`\nPER FASE\n`);
  for (const [fase, n] of Object.entries(r.perFase).sort((a, b) => b[1] - a[1])) {
    uit(`  ${(FASE_LABEL[fase as Fase] ?? fase).padEnd(24)} ${n}\n`);
  }
  return r.opslag.mislukt > 0 ? 1 : 0;
}

main().then(
  async (code) => {
    await sluitAllePools();
    process.exit(code);
  },
  async (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    await sluitAllePools();
    process.exit(1);
  },
);
