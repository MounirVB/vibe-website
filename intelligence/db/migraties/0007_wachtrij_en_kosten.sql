-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0007 wachtrij, kosten, meldingen
-- ------------------------------------------------------------
-- Duurzame wachtrij met SKIP LOCKED, een lease zodat een gevallen
-- worker zijn taak teruggeeft, idempotentie per logisch venster,
-- een dead-letter-status, en kostenbeheersing met een eerlijke
-- ONBEKEND voor prijzen die we niet gemeten hebben.
-- ============================================================

-- ------------------------------------------------------------
-- Taken
-- ------------------------------------------------------------
create table if not exists intel.taken (
  id                   bigint generated always as identity primary key,
  organisatie_id       bigint not null references intel.organisaties(id) on delete restrict,
  soort                text   not null,
  -- Het venster hoort in de sleutel. 'ophalen:bron:12:2026-10-10T12'
  -- kan dus precies een keer per uur bestaan, hoe vaak de planner ook
  -- draait. Dat is de idempotentie van de cron.
  idempotentie_sleutel text,
  payload              jsonb  not null default '{}'::jsonb,
  prioriteit           smallint not null default 100,

  status               text not null default 'wachtend' check (status in (
                         'wachtend', 'bezig', 'gereed', 'mislukt', 'dlq', 'afgebroken')),
  pogingen             integer not null default 0,
  max_pogingen         integer not null default 5 check (max_pogingen >= 1),

  beschikbaar_op       timestamptz not null default now(),
  vergrendeld_door     text,
  vergrendeld_op       timestamptz,
  -- Lease. Loopt die af terwijl de taak nog 'bezig' is, dan is de
  -- worker weg en geeft de opruimer de taak terug aan de wachtrij.
  zichtbaarheid_tot    timestamptz,

  laatste_fout         text,
  laatste_fout_soort   text,
  gereed_op            timestamptz,
  duur_ms              integer,

  aangemaakt_op        timestamptz not null default now(),
  bijgewerkt_op        timestamptz not null default now()
);

comment on column intel.taken.idempotentie_sleutel is
  'Uniek over alle statussen. Een taak voor hetzelfde venster kan dus niet twee keer bestaan, ook niet na een herstart.';
comment on column intel.taken.status is
  'dlq = definitief mislukt na max_pogingen. Een dlq-taak blokkeert de rest van de pijplijn niet.';

create unique index if not exists taken_idempotent_uniek
  on intel.taken (organisatie_id, soort, idempotentie_sleutel)
  where idempotentie_sleutel is not null;

-- De claimquery van de worker leest precies deze index.
create index if not exists taken_claim_idx
  on intel.taken (organisatie_id, prioriteit, beschikbaar_op)
  where status = 'wachtend';
create index if not exists taken_lease_idx
  on intel.taken (zichtbaarheid_tot)
  where status = 'bezig';
create index if not exists taken_dlq_idx
  on intel.taken (organisatie_id, bijgewerkt_op desc)
  where status = 'dlq';
create index if not exists taken_soort_idx on intel.taken (organisatie_id, soort, status);
create index if not exists taken_payload_gin on intel.taken using gin (payload jsonb_path_ops);

drop trigger if exists taken_bijgewerkt on intel.taken;
create trigger taken_bijgewerkt before update on intel.taken
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Planneruitvoeringen. Observability voor de cron zelf: een tick
-- die niets deed moet te onderscheiden zijn van een tick die niet
-- draaide.
-- ------------------------------------------------------------
create table if not exists intel.planner_runs (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint references intel.organisaties(id) on delete restrict,
  soort           text not null,
  venster_sleutel text not null,
  gestart_op      timestamptz not null default now(),
  afgerond_op     timestamptz,
  duur_ms         integer,
  resultaat       text check (resultaat in ('ok', 'fout', 'overgeslagen')),
  taken_aangemaakt integer not null default 0,
  taken_overgeslagen integer not null default 0,
  fout_bericht    text,

  constraint planner_runs_uniek unique nulls not distinct (organisatie_id, soort, venster_sleutel)
);

create index if not exists planner_runs_idx on intel.planner_runs (soort, gestart_op desc);

-- ------------------------------------------------------------
-- AI-aanroepen. Elke modelaanroep wordt geteld; dit is de basis
-- voor kostenplafonds en voor de vraag "hoeveel heeft dit gekost".
-- ------------------------------------------------------------
create table if not exists intel.ai_aanroepen (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  doel            text not null,
  provider        text not null,
  model           text not null,
  prompt_hash     text not null,
  tokens_in       integer,
  tokens_uit      integer,
  -- NULL betekent ONBEKEND: er is geen geverifieerde prijs voor dit
  -- model geconfigureerd. Er wordt nooit een tarief verzonnen.
  kosten_schatting numeric(12,6),
  valuta          text,
  kosten_bron     text not null default 'onbekend',
  duur_ms         integer,
  geslaagd        boolean not null,
  fout_soort      text,
  taak_id         bigint references intel.taken(id) on delete set null,
  op              timestamptz not null default now()
);

comment on column intel.ai_aanroepen.kosten_schatting is
  'Alleen gevuld als intel.ai_prijzen een gemeten tarief voor dit model bevat. Anders ONBEKEND.';

create index if not exists ai_aanroepen_organisatie_idx on intel.ai_aanroepen (organisatie_id, op desc);
create index if not exists ai_aanroepen_doel_idx on intel.ai_aanroepen (organisatie_id, doel, op desc);
create index if not exists ai_aanroepen_taak_idx on intel.ai_aanroepen (taak_id);

-- Tariefkaart. Bewust leeg bij installatie: een tarief hoort hier
-- alleen te staan met een bron-URL en een meetdatum.
create table if not exists intel.ai_prijzen (
  provider              text not null,
  model                 text not null,
  prijs_in_per_miljoen  numeric(12,6) not null,
  prijs_uit_per_miljoen numeric(12,6) not null,
  valuta                text not null,
  bron_url              text not null,
  gemeten_op            date not null,
  primary key (provider, model)
);

comment on table intel.ai_prijzen is
  'Leeg bij installatie. Zonder rij hier blijft kosten_schatting ONBEKEND; een verzonnen tarief is erger dan geen tarief.';

-- ------------------------------------------------------------
-- Kostenplafonds. Harde begrenzing per dag, per organisatie.
-- ------------------------------------------------------------
create table if not exists intel.kostenplafonds (
  id                     bigint generated always as identity primary key,
  organisatie_id         bigint not null references intel.organisaties(id) on delete restrict,
  max_ai_aanroepen_per_dag integer not null default 200 check (max_ai_aanroepen_per_dag >= 0),
  max_tokens_uit_per_dag integer not null default 400000 check (max_tokens_uit_per_dag >= 0),
  max_bron_ophalingen_per_dag integer not null default 2000 check (max_bron_ophalingen_per_dag >= 0),
  max_concurrency        smallint not null default 4 check (max_concurrency between 1 and 32),
  actief                 boolean not null default true,
  bijgewerkt_op          timestamptz not null default now(),

  constraint kostenplafonds_een_per_organisatie unique (organisatie_id)
);

drop trigger if exists kostenplafonds_bijgewerkt on intel.kostenplafonds;
create trigger kostenplafonds_bijgewerkt before update on intel.kostenplafonds
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Systeemmeldingen. Een gevallen worker moet zichtbaar zijn zonder
-- dat iemand in de logs duikt.
-- ------------------------------------------------------------
create table if not exists intel.systeem_meldingen (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint references intel.organisaties(id) on delete restrict,
  soort           text not null,
  ernst           text not null check (ernst in ('info', 'waarschuwing', 'fout', 'kritiek')),
  bericht         text not null,
  context         jsonb not null default '{}'::jsonb,
  -- Dedupsleutel zodat een herhaalde fout niet duizend meldingen maakt.
  dedup_sleutel   text,
  aantal          integer not null default 1,
  eerst_op        timestamptz not null default now(),
  laatst_op       timestamptz not null default now(),
  opgelost_op     timestamptz,
  opgelost_door   bigint references intel.gebruikers(id) on delete set null
);

create unique index if not exists systeem_meldingen_dedup_uniek
  on intel.systeem_meldingen (organisatie_id, soort, dedup_sleutel)
  where dedup_sleutel is not null and opgelost_op is null;
create index if not exists systeem_meldingen_open_idx
  on intel.systeem_meldingen (organisatie_id, ernst, laatst_op desc)
  where opgelost_op is null;
create index if not exists systeem_meldingen_opgelost_door_idx
  on intel.systeem_meldingen (opgelost_door);

-- ------------------------------------------------------------
-- De planner moet weten welke organisaties actief zijn, maar de
-- applicatierol ziet door RLS alleen haar eigen organisatie. Deze
-- functie is de enige uitzondering, en is daarom zo smal mogelijk:
-- geen parameters, geen door de gebruiker beinvloedbare invoer,
-- lege search_path, en ze geeft uitsluitend id en sleutel terug.
-- ------------------------------------------------------------
create or replace function intel_priv.actieve_organisaties()
returns table (id bigint, sleutel text)
language sql
security definer
stable
set search_path = ''
as $$
  select o.id, o.sleutel from intel.organisaties o where o.actief
$$;

comment on function intel_priv.actieve_organisaties() is
  'SECURITY DEFINER met opzet: de planner heeft de organisatielijst nodig vóór er een organisatiecontext is. Geeft geen tenantdata terug.';

-- Postgres geeft nieuwe functies standaard EXECUTE aan PUBLIC. Dat
-- wordt hier voor elke functie expliciet teruggenomen.
revoke all on function intel_priv.actieve_organisaties() from public;
grant execute on function intel_priv.actieve_organisaties() to vibe_intel_app;

-- ------------------------------------------------------------
-- RLS en grants
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'taken', 'ai_aanroepen', 'kostenplafonds', 'systeem_meldingen'
  ]
  loop
    execute format('alter table intel.%I enable row level security', t);
    execute format('drop policy if exists %I_eigen_organisatie on intel.%I', t, t);
    execute format($f$
      create policy %I_eigen_organisatie on intel.%I
        for all to vibe_intel_app, vibe_intel_lezer
        using (organisatie_id = (select intel_priv.huidige_organisatie()))
        with check (organisatie_id = (select intel_priv.huidige_organisatie()))
    $f$, t, t);
  end loop;
end $$;

-- planner_runs kan een NULL-organisatie hebben (planner-brede ticks);
-- de policy laat die rijen door en begrenst de rest op de organisatie.
alter table intel.planner_runs enable row level security;
drop policy if exists planner_runs_eigen_organisatie on intel.planner_runs;
create policy planner_runs_eigen_organisatie on intel.planner_runs
  for all to vibe_intel_app, vibe_intel_lezer
  using (organisatie_id is null or organisatie_id = (select intel_priv.huidige_organisatie()))
  with check (organisatie_id is null or organisatie_id = (select intel_priv.huidige_organisatie()));

grant select, insert, update on intel.taken to vibe_intel_app;
grant select, insert, update on intel.planner_runs to vibe_intel_app;
grant select, insert on intel.ai_aanroepen to vibe_intel_app;
grant select on intel.ai_prijzen to vibe_intel_app, vibe_intel_lezer;
grant select, insert, update on intel.kostenplafonds to vibe_intel_app;
grant select, insert, update on intel.systeem_meldingen to vibe_intel_app;

grant select on intel.taken, intel.planner_runs, intel.ai_aanroepen,
                intel.kostenplafonds, intel.systeem_meldingen to vibe_intel_lezer;

grant usage on sequence intel.taken_id_seq,
                        intel.planner_runs_id_seq,
                        intel.ai_aanroepen_id_seq,
                        intel.kostenplafonds_id_seq,
                        intel.systeem_meldingen_id_seq to vibe_intel_app;
