-- ============================================================
-- 0029 — goedkeuring bindt aan een inhoudshash (par. 15)
-- ------------------------------------------------------------
-- Tot nu toe legde `beoordeling` vast DAT iemand had goedgekeurd, niet
-- WAT. Dat is een reel gat: de voorstelmotor draait elke ronde opnieuw
-- en werkt de rij bij (`on conflict do update`). Een voorstel dat
-- gisteren is goedgekeurd kan vandaag een andere alinea, een ander
-- doelpad of een andere CTA dragen, met de goedkeuring er nog aan.
-- Dan publiceer je iets wat niemand heeft gezien.
--
-- Par. 15 lost dat op: de goedkeuring bindt aan een hash over de
-- inhoud. Verandert de inhoud wezenlijk, dan vervalt de goedkeuring en
-- moet er opnieuw naar gekeken worden. De hash wordt berekend over
-- precies die velden die bepalen WAT er op de pagina komt — niet over
-- tijdstempels of over de onderbouwing, want die veranderen zonder dat
-- de wijziging anders wordt.
--
-- DE PUBLICATIEKETEN (par. 16)
-- DRAFT -> READY_FOR_REVIEW -> APPROVED -> PUBLICATION_PRECHECK
--       -> DEPLOYMENT -> LIVE_VERIFIED
-- Elke stap is een vastgelegde toestand met een moment, zodat er na een
-- publicatie te reconstrueren is wie wat wanneer heeft vrijgegeven.
-- Een voorstel kan deze keten alleen VOORWAARTS doorlopen; terugvallen
-- gebeurt door af te keuren, en dat is een eigen toestand.
-- ============================================================

alter table intel.inhoud_voorstellen
  -- De hash over de inhoud zoals die NU in de rij staat.
  add column if not exists inhouds_hash        text,
  -- De hash zoals die was op het moment van goedkeuren. Verschilt hij
  -- van inhouds_hash, dan is de goedkeuring verlopen.
  add column if not exists goedgekeurd_hash    text,
  add column if not exists publicatie_status   text not null default 'DRAFT',
  add column if not exists precheck_op         timestamptz,
  add column if not exists precheck_uitslag    text,
  add column if not exists uitgerold_op        timestamptz,
  add column if not exists live_geverifieerd_op timestamptz,
  add column if not exists live_bewijs         text;

alter table intel.inhoud_voorstellen drop constraint if exists voorstellen_publicatie_status_geldig;
alter table intel.inhoud_voorstellen add constraint voorstellen_publicatie_status_geldig check (
  publicatie_status in (
    'DRAFT',
    'READY_FOR_REVIEW',
    'APPROVED',
    'PUBLICATION_PRECHECK',
    'DEPLOYMENT',
    'LIVE_VERIFIED',
    -- Afgekeurd is geen stap in de keten maar een eindpunt ernaast.
    'REJECTED'));

-- GEEN GOEDKEURING ZONDER GEBONDEN HASH.
-- Dit is de constraint die par. 15 afdwingt op databaseniveau: wie de
-- status op APPROVED of verder zet, moet zeggen WAT hij goedkeurde.
-- Zonder dit kan een latere wijziging onder een bestaande goedkeuring
-- doorschuiven, en dat is precies wat niet mag.
alter table intel.inhoud_voorstellen drop constraint if exists voorstellen_goedkeuring_bindt;
alter table intel.inhoud_voorstellen add constraint voorstellen_goedkeuring_bindt check (
  publicatie_status not in ('APPROVED', 'PUBLICATION_PRECHECK', 'DEPLOYMENT', 'LIVE_VERIFIED')
  or (goedgekeurd_hash is not null and beoordeeld_door is not null and beoordeeld_op is not null));

-- Een uitrol zonder precheck is geen uitrol maar een gok.
alter table intel.inhoud_voorstellen drop constraint if exists voorstellen_uitrol_na_precheck;
alter table intel.inhoud_voorstellen add constraint voorstellen_uitrol_na_precheck check (
  publicatie_status not in ('DEPLOYMENT', 'LIVE_VERIFIED')
  or (precheck_op is not null and precheck_uitslag = 'PASS'));

-- En live zonder bewijs bestaat niet.
alter table intel.inhoud_voorstellen drop constraint if exists voorstellen_live_heeft_bewijs;
alter table intel.inhoud_voorstellen add constraint voorstellen_live_heeft_bewijs check (
  publicatie_status <> 'LIVE_VERIFIED'
  or (live_geverifieerd_op is not null and live_bewijs is not null));

create index if not exists voorstellen_publicatie_status_idx
  on intel.inhoud_voorstellen (organisatie_id, publicatie_status);

-- ------------------------------------------------------------
-- Auditspoor van de beoordeling
-- ------------------------------------------------------------
-- `beoordeling` op de rij houdt alleen de LAATSTE beslissing. Par. 14
-- vraagt een geschiedenis: wie heeft wanneer wat besloten, en op welke
-- inhoud. Append-only, net als de uitspraakcorrecties.
create table if not exists intel.voorstel_beoordelingen (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  voorstel_id     bigint not null references intel.inhoud_voorstellen(id) on delete restrict,
  -- Waar de beslissing over ging. Zonder dit is een beslissing niet
  -- terug te koppelen aan een versie van de tekst.
  inhouds_hash    text not null,
  besluit         text not null check (besluit in (
                    'goedgekeurd', 'afgewezen', 'herziening_gevraagd', 'goedkeuring_vervallen')),
  door            text not null,
  notitie         text,
  -- De toestand voor en na, zodat de keten navraagbaar is.
  status_voor     text not null,
  status_na       text not null,
  op              timestamptz not null default now(),
  constraint beoordeling_heeft_beoordelaar check (length(door) >= 3),
  constraint beoordeling_hash_vorm check (inhouds_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists voorstel_beoordelingen_voorstel_idx
  on intel.voorstel_beoordelingen (organisatie_id, voorstel_id, op desc);

alter table intel.voorstel_beoordelingen enable row level security;
drop policy if exists voorstel_beoordelingen_eigen_organisatie on intel.voorstel_beoordelingen;
create policy voorstel_beoordelingen_eigen_organisatie on intel.voorstel_beoordelingen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

-- INSERT en SELECT, geen UPDATE en geen DELETE: een auditspoor dat je
-- kunt bijwerken is geen auditspoor.
grant select, insert on intel.voorstel_beoordelingen to vibe_intel_app;
grant usage on sequence intel.voorstel_beoordelingen_id_seq to vibe_intel_app;
grant select on intel.voorstel_beoordelingen to vibe_intel_lezer;

comment on column intel.inhoud_voorstellen.goedgekeurd_hash is
  'De inhoudshash op het moment van goedkeuren. Wijkt hij af van inhouds_hash, dan is de inhoud veranderd en is de goedkeuring vervallen (par. 15).';
comment on column intel.inhoud_voorstellen.publicatie_status is
  'DRAFT -> READY_FOR_REVIEW -> APPROVED -> PUBLICATION_PRECHECK -> DEPLOYMENT -> LIVE_VERIFIED, of REJECTED.';
comment on table intel.voorstel_beoordelingen is
  'Append-only auditspoor van redactionele beslissingen, elk gebonden aan de inhoudshash waarover is besloten.';
