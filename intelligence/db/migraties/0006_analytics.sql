-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0006 analytics
-- ------------------------------------------------------------
-- Zoekprestaties, indexatie, funnel en attributie.
--
-- Twee ontwerpregels die hier alles bepalen:
--  1. Een ontbrekende rij is NIET nul. Daarom houdt
--     intel.analytics_dekking bij welke periodes echt zijn
--     opgehaald. Alles buiten die dekking is ONBEKEND.
--  2. Attributie draagt altijd haar eigen onzekerheid mee. Er
--     bestaat geen kolom die zegt "dit artikel leverde deze deal".
-- ============================================================

-- ------------------------------------------------------------
-- Koppelingen. Dit is het eerlijke antwoord op "is GSC
-- aangesloten?" — status wordt gemeten, niet aangenomen.
-- ------------------------------------------------------------
create table if not exists intel.koppelingen (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  sleutel         text   not null,
  soort           text   not null check (soort in (
                    'gsc', 'bing_webmaster', 'ga4', 'crm', 'agenda', 'mail', 'ai_model')),
  status          text   not null default 'niet_geconfigureerd' check (status in (
                    'niet_geconfigureerd', 'geconfigureerd', 'geverifieerd', 'fout')),
  -- Namen van de benodigde omgevingsvariabelen. Nooit waarden.
  benodigde_env   text[] not null default '{}',
  ontbrekende_env text[] not null default '{}',
  laatste_check_op timestamptz,
  bewijs          text,
  fout_bericht    text,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_op   timestamptz not null default now(),

  constraint koppelingen_sleutel_uniek unique (organisatie_id, sleutel)
);

comment on column intel.koppelingen.benodigde_env is
  'Alleen variabelenamen. Geheimen staan nooit in de database.';

create index if not exists koppelingen_organisatie_idx on intel.koppelingen (organisatie_id);

drop trigger if exists koppelingen_bijgewerkt on intel.koppelingen;
create trigger koppelingen_bijgewerkt before update on intel.koppelingen
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Dekking: welke periode is per bron daadwerkelijk opgehaald.
-- ------------------------------------------------------------
create table if not exists intel.analytics_dekking (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  bron            text   not null check (bron in ('gsc', 'bing_webmaster', 'ga4', 'crm')),
  datum_vanaf     date   not null,
  datum_tot       date   not null,
  opgehaald_op    timestamptz not null default now(),
  aantal_rijen    integer not null default 0,
  afgekapt        boolean not null default false,
  volledig        boolean not null default false,
  opmerking       text,

  constraint analytics_dekking_periode_logisch check (datum_tot >= datum_vanaf),
  constraint analytics_dekking_uniek unique (organisatie_id, bron, datum_vanaf, datum_tot)
);

comment on column intel.analytics_dekking.afgekapt is
  'True als de API meer rijen had dan opgehaald. Dan zijn de totalen een ondergrens, geen totaal.';

create index if not exists analytics_dekking_idx
  on intel.analytics_dekking (organisatie_id, bron, datum_vanaf desc);

-- ------------------------------------------------------------
-- Zoekvraagmetingen per dag.
-- gemiddelde_positie blijft NULL als de bron die niet levert; de
-- conventie van de bron wordt per rijgroep vastgelegd zodat er
-- nooit geraden wordt of 0 of 1 de eerste plek is.
-- ------------------------------------------------------------
create table if not exists intel.zoekvraag_metingen (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  bron              text not null check (bron in ('gsc', 'bing_webmaster')),
  datum             date not null,
  zoekvraag         text not null,
  pagina_pad        text,
  land              text,
  apparaat          text,
  impressies        integer,
  kliks             integer,
  ctr               numeric(7,6),
  gemiddelde_positie numeric(7,3),
  positie_conventie text not null default 'onbekend'
                      check (positie_conventie in ('een_gebaseerd', 'nul_gebaseerd', 'onbekend')),
  opgehaald_op      timestamptz not null default now(),

  -- NULLS NOT DISTINCT is hier essentieel: pagina_pad, land en apparaat
  -- zijn nullable, en met de standaardregel zouden twee rijen met NULL
  -- als verschillend gelden. Dan werkt de upsert niet en groeit de tabel
  -- bij elke ophaling opnieuw.
  constraint zoekvraag_metingen_uniek
    unique nulls not distinct (organisatie_id, bron, datum, zoekvraag, pagina_pad, land, apparaat)
);

comment on column intel.zoekvraag_metingen.positie_conventie is
  'Gemeten uit de API-respons, niet aangenomen. Zolang dit onbekend is toont het dashboard de positie zonder rangordeconclusie.';

create index if not exists zoekvraag_metingen_organisatie_idx
  on intel.zoekvraag_metingen (organisatie_id, datum desc);
create index if not exists zoekvraag_metingen_vraag_idx
  on intel.zoekvraag_metingen (organisatie_id, zoekvraag, datum desc);
create index if not exists zoekvraag_metingen_pagina_idx
  on intel.zoekvraag_metingen (organisatie_id, pagina_pad, datum desc)
  where pagina_pad is not null;

-- ------------------------------------------------------------
-- Indexatiestatus per URL.
-- ------------------------------------------------------------
create table if not exists intel.indexatie_status (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  pagina_id       bigint references intel.pagina_register(id) on delete cascade,
  url             text not null,
  in_sitemap      boolean,
  geindexeerd     text check (geindexeerd in ('ja', 'nee', 'onbekend')),
  bron            text not null check (bron in ('gsc', 'bing_webmaster', 'eigen_meting')),
  http_status     integer,
  laatst_gecontroleerd_op timestamptz not null default now(),
  bewijs          text,

  constraint indexatie_status_uniek unique (organisatie_id, url, bron)
);

create index if not exists indexatie_status_pagina_idx on intel.indexatie_status (pagina_id);
create index if not exists indexatie_status_organisatie_idx
  on intel.indexatie_status (organisatie_id, laatst_gecontroleerd_op desc);

-- ------------------------------------------------------------
-- Funnel. Alleen stappen waarvoor een bron bestaat; zolang GA4 en
-- het CRM niet aangesloten zijn blijft deze tabel leeg en meldt het
-- dashboard NIET AANGESLOTEN in plaats van nullen.
-- ------------------------------------------------------------
create table if not exists intel.funnel_metingen (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  datum           date not null,
  stap            text not null check (stap in (
                    'zoekimpressie', 'klik', 'landing', 'gekwalificeerd_bezoek',
                    'aanvraag', 'afspraak', 'voorstel', 'gewonnen')),
  pagina_pad      text,
  aantal          integer not null check (aantal >= 0),
  bron            text not null check (bron in ('gsc', 'ga4', 'crm', 'eigen_meting')),
  consent_grondslag text,
  opgehaald_op    timestamptz not null default now(),

  constraint funnel_metingen_uniek
    unique nulls not distinct (organisatie_id, datum, stap, pagina_pad, bron)
);

create index if not exists funnel_metingen_idx
  on intel.funnel_metingen (organisatie_id, datum desc, stap);

-- ------------------------------------------------------------
-- Attributie met expliciete onzekerheid.
-- ------------------------------------------------------------
create table if not exists intel.attributies (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  inhoud_versie_id  bigint references intel.inhoud_versies(id) on delete set null,
  pagina_id         bigint references intel.pagina_register(id) on delete set null,
  uitkomst_soort    text not null check (uitkomst_soort in (
                      'aanvraag', 'afspraak', 'voorstel', 'gewonnen_project')),
  uitkomst_externe_id text,
  datum             date not null,
  methode           text not null check (methode in (
                      'laatste_klik', 'eerste_klik', 'landingspagina', 'handmatig', 'geen')),
  zekerheid         text not null check (zekerheid in ('bewezen', 'waarschijnlijk', 'mogelijk', 'onbekend')),
  onzekerheid_reden text not null,
  bewijs            jsonb not null default '{}'::jsonb,
  aangemaakt_op     timestamptz not null default now()
);

comment on table intel.attributies is
  'Koppelt inhoud aan commerciele uitkomsten. onzekerheid_reden is verplicht: zonder verdedigbare methode is de zekerheid onbekend.';

create index if not exists attributies_organisatie_idx on intel.attributies (organisatie_id, datum desc);
create index if not exists attributies_inhoud_idx on intel.attributies (inhoud_versie_id);
create index if not exists attributies_pagina_idx on intel.attributies (pagina_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'attributies_bewezen_vereist_methode'
      and conrelid = 'intel.attributies'::regclass
  ) then
    alter table intel.attributies
      add constraint attributies_bewezen_vereist_methode
      check (zekerheid <> 'bewezen' or methode <> 'geen');
  end if;
end $$;

-- ------------------------------------------------------------
-- RLS en grants
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'koppelingen', 'analytics_dekking', 'zoekvraag_metingen',
    'indexatie_status', 'funnel_metingen', 'attributies'
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

grant select, insert, update on intel.koppelingen to vibe_intel_app;
grant select, insert, update on intel.analytics_dekking to vibe_intel_app;
grant select, insert, update on intel.zoekvraag_metingen to vibe_intel_app;
grant select, insert, update on intel.indexatie_status to vibe_intel_app;
grant select, insert, update on intel.funnel_metingen to vibe_intel_app;
grant select, insert on intel.attributies to vibe_intel_app;

grant select on intel.koppelingen, intel.analytics_dekking, intel.zoekvraag_metingen,
                intel.indexatie_status, intel.funnel_metingen, intel.attributies
             to vibe_intel_lezer;

grant usage on sequence intel.koppelingen_id_seq,
                        intel.analytics_dekking_id_seq,
                        intel.zoekvraag_metingen_id_seq,
                        intel.indexatie_status_id_seq,
                        intel.funnel_metingen_id_seq,
                        intel.attributies_id_seq to vibe_intel_app;
