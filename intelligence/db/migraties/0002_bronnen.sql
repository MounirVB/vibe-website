-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0002 bronnen
-- ------------------------------------------------------------
-- Bronregister, ophaallog, brondocumenten en inhoud-gehashte
-- versies. Dit is de bewijsvoet van het hele platform: niets
-- verderop in de keten mag bestaan zonder een versie hier.
-- ============================================================

-- ------------------------------------------------------------
-- Bronregister
-- ------------------------------------------------------------
create table if not exists intel.bronnen (
  id                      bigint generated always as identity primary key,
  organisatie_id          bigint not null references intel.organisaties(id) on delete restrict,
  sleutel                 text   not null,
  uitgever                text   not null,
  soort                   text   not null check (soort in (
                            'rss', 'atom', 'json_api', 'odata', 'sru', 'sitemap',
                            'html_lijst', 'dataset', 'wfs')),
  endpoint_url            text   not null,
  basis_url               text,
  actief                  boolean not null default true,

  -- Bronkwaliteit en voorwaarden. Alles wat hier staat is gemeten of
  -- door de uitgever gesteld; nooit geschat.
  betrouwbaarheid         smallint not null default 3 check (betrouwbaarheid between 1 and 5),
  is_primaire_bron        boolean  not null default false,
  licentie                text,
  licentie_url            text,
  robots_status           text     not null default 'onbekend'
                            check (robots_status in ('toegestaan', 'verboden', 'onbekend')),
  robots_gecontroleerd_op timestamptz,
  mag_citeren             boolean  not null default false,
  citaat_limiet_tekens    integer  not null default 0 check (citaat_limiet_tekens >= 0),

  -- Verificatie van het endpoint zelf. 'geverifieerd' betekent: in een
  -- sessie opgehaald én geparseerd tot echte items.
  verificatie_status      text not null default 'onbevestigd'
                            check (verificatie_status in ('geverifieerd', 'onbevestigd', 'afgewezen')),
  verificatie_bewijs      text,
  verificatie_op          timestamptz,

  -- Ophaalbeleid en kostenbeheersing
  ophaalinterval_minuten  integer not null default 360 check (ophaalinterval_minuten >= 5),
  min_interval_seconden   integer not null default 5 check (min_interval_seconden >= 0),
  max_items_per_ophaling  integer not null default 100 check (max_items_per_ophaling between 1 and 1000),

  geo_bereik              text not null default 'nl',
  onderwerpen             text[] not null default '{}',
  config                  jsonb  not null default '{}'::jsonb,

  -- Laatste toestand (conditional GET en gezondheid)
  laatste_etag            text,
  laatste_last_modified   text,
  laatst_opgehaald_op     timestamptz,
  laatst_gewijzigd_op     timestamptz,
  laatste_resultaat       text check (laatste_resultaat in ('ok', 'niet_gewijzigd', 'fout')),
  opeenvolgende_fouten    integer not null default 0,

  aangemaakt_op           timestamptz not null default now(),
  bijgewerkt_op           timestamptz not null default now(),

  constraint bronnen_sleutel_uniek_per_organisatie unique (organisatie_id, sleutel)
);

comment on table intel.bronnen is
  'Geconfigureerde bronnen. verificatie_status=geverifieerd mag alleen gezet worden na een echte ophaling met geparseerde items.';
comment on column intel.bronnen.mag_citeren is
  'Mag er letterlijk uit geciteerd worden, en zo ja hoeveel tekens. Default nee: dan alleen eigen formulering met bronverwijzing.';
comment on column intel.bronnen.robots_status is
  'Uitkomst van het daadwerkelijk lezen van robots.txt. onbekend = niet gelezen, en dan haalt de collector niet op.';

create index if not exists bronnen_organisatie_idx on intel.bronnen (organisatie_id);
create index if not exists bronnen_onderwerpen_gin on intel.bronnen using gin (onderwerpen);
create index if not exists bronnen_config_gin on intel.bronnen using gin (config jsonb_path_ops);
-- Planner van de collector: welke actieve bron is toe aan een ophaling?
create index if not exists bronnen_planning_idx
  on intel.bronnen (organisatie_id, laatst_opgehaald_op nulls first)
  where actief;

drop trigger if exists bronnen_bijgewerkt on intel.bronnen;
create trigger bronnen_bijgewerkt before update on intel.bronnen
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Ophaallog. Append-only; dit is de observability-voet voor
-- bronversheid en foutpercentages.
-- ------------------------------------------------------------
create table if not exists intel.bron_ophalingen (
  id             bigint generated always as identity primary key,
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  bron_id        bigint not null references intel.bronnen(id) on delete cascade,
  gestart_op     timestamptz not null default now(),
  duur_ms        integer,
  http_status    integer,
  resultaat      text not null check (resultaat in ('ok', 'niet_gewijzigd', 'fout', 'overgeslagen')),
  aantal_items   integer not null default 0,
  aantal_nieuw   integer not null default 0,
  aantal_gewijzigd integer not null default 0,
  bytes          integer,
  etag           text,
  last_modified  text,
  fout_soort     text,
  fout_bericht   text,
  reden_overgeslagen text
);

create index if not exists bron_ophalingen_bron_idx
  on intel.bron_ophalingen (bron_id, gestart_op desc);
create index if not exists bron_ophalingen_organisatie_idx
  on intel.bron_ophalingen (organisatie_id, gestart_op desc);
create index if not exists bron_ophalingen_fouten_idx
  on intel.bron_ophalingen (organisatie_id, gestart_op desc)
  where resultaat = 'fout';

-- ------------------------------------------------------------
-- Brondocumenten: één rij per document/item bij een bron.
-- ------------------------------------------------------------
create table if not exists intel.brondocumenten (
  id                 bigint generated always as identity primary key,
  organisatie_id     bigint not null references intel.organisaties(id) on delete restrict,
  bron_id            bigint not null references intel.bronnen(id) on delete cascade,
  extern_id          text   not null,
  canonieke_url      text   not null,
  titel              text   not null,
  uitgever           text   not null,
  soort              text   not null,
  taal               text,
  gepubliceerd_op    timestamptz,
  eerst_opgehaald_op timestamptz not null default now(),
  laatst_opgehaald_op timestamptz not null default now(),
  geo_bereik         text,
  onderwerpen        text[] not null default '{}',
  huidige_versie_id  bigint,
  aantal_versies     integer not null default 0,
  status             text not null default 'actief'
                       check (status in ('actief', 'verdwenen', 'genegeerd')),
  verdwenen_sinds    timestamptz,
  aangemaakt_op      timestamptz not null default now(),
  bijgewerkt_op      timestamptz not null default now(),

  constraint brondocumenten_extern_uniek unique (bron_id, extern_id)
);

comment on column intel.brondocumenten.status is
  'verdwenen = de bron levert het item niet meer. Afgeleide inhoud wordt dan hergewaardeerd, niet stil gelaten.';

create index if not exists brondocumenten_organisatie_idx on intel.brondocumenten (organisatie_id);
create index if not exists brondocumenten_bron_idx on intel.brondocumenten (bron_id);
create index if not exists brondocumenten_gepubliceerd_idx
  on intel.brondocumenten (organisatie_id, gepubliceerd_op desc nulls last);
create index if not exists brondocumenten_url_idx on intel.brondocumenten (canonieke_url);
create index if not exists brondocumenten_onderwerpen_gin on intel.brondocumenten using gin (onderwerpen);
create index if not exists brondocumenten_huidige_versie_idx on intel.brondocumenten (huidige_versie_id);

drop trigger if exists brondocumenten_bijgewerkt on intel.brondocumenten;
create trigger brondocumenten_bijgewerkt before update on intel.brondocumenten
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Versies. De inhoudshash is de dedup- en wijzigingsdetector.
-- ruwe_tekst is genormaliseerde brontekst, uitsluitend voor
-- verwerking. Publiceren daarvan is verboden; de poort in
-- src/inhoud/poorten.ts handhaaft dat, en mag_citeren op de bron
-- bepaalt of er letterlijk uit geciteerd mag worden.
-- ------------------------------------------------------------
create table if not exists intel.brondocument_versies (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  brondocument_id   bigint not null references intel.brondocumenten(id) on delete cascade,
  versie            integer not null,
  inhoud_hash       text    not null,
  titel             text    not null,
  ruwe_tekst        text    not null,
  tekst_lengte      integer not null,
  samenvatting_bron text,
  opgehaald_op      timestamptz not null default now(),
  http_status       integer,

  wijziging_soort   text not null default 'nieuw'
                      check (wijziging_soort in ('nieuw', 'materieel', 'cosmetisch')),
  vorige_versie_id  bigint references intel.brondocument_versies(id) on delete set null,
  verschil_ratio    numeric(5,4),

  -- Promptinjectie-afweer: brontekst is data, nooit instructie.
  injectie_verdacht boolean not null default false,
  injectie_patronen text[] not null default '{}',

  zoekvector        tsvector generated always as (
                      to_tsvector('dutch', coalesce(titel, '') || ' ' || coalesce(ruwe_tekst, ''))
                    ) stored,

  constraint versies_hash_uniek unique (brondocument_id, inhoud_hash),
  constraint versies_nummer_uniek unique (brondocument_id, versie)
);

comment on column intel.brondocument_versies.ruwe_tekst is
  'Genormaliseerde brontekst voor verwerking. Nooit publiceren; zie de poort geen_bronherpublicatie.';
comment on column intel.brondocument_versies.injectie_verdacht is
  'Gezet door de deterministische detector in src/pijplijn/injectie.ts. Afgeleide inhoud krijgt dan altijd menselijke review.';

create index if not exists versies_organisatie_idx on intel.brondocument_versies (organisatie_id);
create index if not exists versies_document_idx
  on intel.brondocument_versies (brondocument_id, versie desc);
create index if not exists versies_vorige_idx on intel.brondocument_versies (vorige_versie_id);
create index if not exists versies_hash_idx on intel.brondocument_versies (inhoud_hash);
create index if not exists versies_zoek_gin on intel.brondocument_versies using gin (zoekvector);
create index if not exists versies_injectie_idx
  on intel.brondocument_versies (organisatie_id, opgehaald_op desc)
  where injectie_verdacht;

-- huidige_versie_id verwijst vooruit naar versies; de constraint komt
-- daarom pas nu, idempotent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brondocumenten_huidige_versie_fkey'
      and conrelid = 'intel.brondocumenten'::regclass
  ) then
    alter table intel.brondocumenten
      add constraint brondocumenten_huidige_versie_fkey
      foreign key (huidige_versie_id) references intel.brondocument_versies(id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table intel.bronnen              enable row level security;
alter table intel.bron_ophalingen      enable row level security;
alter table intel.brondocumenten       enable row level security;
alter table intel.brondocument_versies enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bronnen', 'bron_ophalingen', 'brondocumenten', 'brondocument_versies']
  loop
    execute format('drop policy if exists %I_eigen_organisatie on intel.%I', t, t);
    execute format($f$
      create policy %I_eigen_organisatie on intel.%I
        for all to vibe_intel_app, vibe_intel_lezer
        using (organisatie_id = (select intel_priv.huidige_organisatie()))
        with check (organisatie_id = (select intel_priv.huidige_organisatie()))
    $f$, t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant select, insert, update on intel.bronnen to vibe_intel_app;
grant select, insert on intel.bron_ophalingen to vibe_intel_app;
grant select, insert, update on intel.brondocumenten to vibe_intel_app;
grant select, insert, update on intel.brondocument_versies to vibe_intel_app;

grant select on intel.bronnen, intel.bron_ophalingen,
                intel.brondocumenten, intel.brondocument_versies to vibe_intel_lezer;

grant usage on sequence intel.bronnen_id_seq,
                        intel.bron_ophalingen_id_seq,
                        intel.brondocumenten_id_seq,
                        intel.brondocument_versies_id_seq to vibe_intel_app;
