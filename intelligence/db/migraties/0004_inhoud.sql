-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0004 inhoud
-- ------------------------------------------------------------
-- Zoekintenties, het pagina-register met canoniek eigendom, de
-- kandidaten die uit de besluitmotor komen, versiebeheer van
-- inhoud, de binding van elke gepubliceerde claim aan bewijs, en
-- het onveranderlijke publicatiebesluit.
--
-- Het pagina-register is de integratiegrens met Release 1: pagina's
-- met eigenaar_release='release1' mogen door dit platform alleen
-- via een voorstel (patch) geraakt worden, nooit overschreven.
-- ============================================================

-- ------------------------------------------------------------
-- Pagina-register: wie bezit welke URL en welke zoekintentie.
-- ------------------------------------------------------------
create table if not exists intel.pagina_register (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  pad               text   not null,
  canonieke_url     text   not null,
  bestandspad       text,
  titel             text,
  soort             text   not null check (soort in (
                      'home', 'systeem', 'oplossing', 'sector', 'project',
                      'kennis', 'nieuws', 'regio', 'juridisch', 'overig')),
  onderwerp_cluster_id bigint references intel.onderwerp_clusters(id) on delete set null,
  primaire_zoekintentie text,

  -- Integratiegrens. 'release1' = de SEO/GEO-fundament-sessie bezit dit
  -- bestand; wij leveren hoogstens een patchvoorstel.
  eigenaar_release  text not null default 'release1'
                      check (eigenaar_release in ('release1', 'release2', 'onbekend')),
  beheer            text not null default 'handmatig'
                      check (beheer in ('handmatig', 'intelligence')),

  in_sitemap        boolean not null default false,
  bestaat_in_repo   boolean not null default false,
  live_http_status  integer,
  live_gemeten_op   timestamptz,

  laatst_gepubliceerd_op timestamptz,
  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  constraint pagina_register_pad_uniek unique (organisatie_id, pad)
);

comment on table intel.pagina_register is
  'Canoniek eigendom per URL. Gevuld door een scan van de repo en de live sitemap, niet met aannames.';
comment on column intel.pagina_register.beheer is
  'intelligence = dit platform mag het bestand schrijven. handmatig = alleen patchvoorstellen.';

create index if not exists pagina_register_organisatie_idx on intel.pagina_register (organisatie_id);
create index if not exists pagina_register_cluster_idx on intel.pagina_register (onderwerp_cluster_id);
create index if not exists pagina_register_beheer_idx
  on intel.pagina_register (organisatie_id, beheer, soort);

drop trigger if exists pagina_register_bijgewerkt on intel.pagina_register;
create trigger pagina_register_bijgewerkt before update on intel.pagina_register
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Zoekintenties. Geobserveerd en afgeleid worden gescheiden; een
-- onbekend volume blijft NULL en wordt in het dashboard als
-- ONBEKEND getoond, niet als nul.
-- ------------------------------------------------------------
create table if not exists intel.zoekintenties (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  intentie          text   not null,
  genormaliseerd    text   not null,
  soort             text   not null check (soort in (
                      'informationeel', 'commercieel', 'transactioneel', 'navigatie')),
  onderwerp_cluster_id bigint references intel.onderwerp_clusters(id) on delete set null,
  eigenaar_pagina_id   bigint references intel.pagina_register(id) on delete set null,

  -- Bewijs voor het bestaan van deze vraag.
  bewijs_soort      text not null check (bewijs_soort in (
                      'gsc_geobserveerd', 'bing_geobserveerd', 'klantvraag',
                      'brongebeurtenis', 'afgeleid')),
  bewijs_verwijzing text,

  -- NULL betekent ONBEKEND. Nooit een verzonnen getal.
  maandvolume       integer,
  volume_bron       text,
  moeilijkheid      smallint check (moeilijkheid between 0 and 100),
  moeilijkheid_bron text,

  eerst_gezien_op   timestamptz not null default now(),
  laatst_gezien_op  timestamptz not null default now(),
  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  constraint zoekintenties_uniek unique (organisatie_id, genormaliseerd),
  constraint zoekintenties_volume_heeft_bron
    check (maandvolume is null or volume_bron is not null)
);

comment on column intel.zoekintenties.maandvolume is
  'NULL = ONBEKEND. Er is op dit moment geen volumebron aangesloten; een getal hier moet altijd een volume_bron hebben.';

create index if not exists zoekintenties_organisatie_idx on intel.zoekintenties (organisatie_id);
create index if not exists zoekintenties_cluster_idx on intel.zoekintenties (onderwerp_cluster_id);
create index if not exists zoekintenties_eigenaar_idx on intel.zoekintenties (eigenaar_pagina_id);
create index if not exists zoekintenties_geobserveerd_idx
  on intel.zoekintenties (organisatie_id, laatst_gezien_op desc)
  where bewijs_soort in ('gsc_geobserveerd', 'bing_geobserveerd');

drop trigger if exists zoekintenties_bijgewerkt on intel.zoekintenties;
create trigger zoekintenties_bijgewerkt before update on intel.zoekintenties
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Inhoudskandidaten: de uitkomst van de besluitmotor.
-- ------------------------------------------------------------
create table if not exists intel.inhoud_kandidaten (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id    bigint references intel.markt_gebeurtenissen(id) on delete cascade,
  onderwerp_cluster_id bigint references intel.onderwerp_clusters(id) on delete set null,
  zoekintentie_id   bigint references intel.zoekintenties(id) on delete set null,
  doel_pagina_id    bigint references intel.pagina_register(id) on delete set null,

  besluit           text not null check (besluit in (
                      'NEW_ARTICLE', 'UPDATE_EXISTING', 'REGIONAL_PATCH', 'KNOWLEDGE_UPDATE',
                      'SALES_SIGNAL', 'DISTRIBUTION_ONLY', 'MONITOR', 'REJECT')),
  -- Volledige, herspeelbare onderbouwing: elke as met score en reden.
  beoordeling       jsonb not null default '{}'::jsonb,
  totaalscore       smallint not null default 0 check (totaalscore between 0 and 100),
  besluit_redenen   text[] not null default '{}',
  motor_versie      text not null,

  risico_klasse     text not null default 'laag' check (risico_klasse in ('laag', 'midden', 'hoog')),
  status            text not null default 'open' check (status in (
                      'open', 'in_concept', 'afgehandeld', 'vervallen')),

  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now()
);

comment on column intel.inhoud_kandidaten.beoordeling is
  'Per as: score, gewicht, grondslag. De besluitmotor is deterministisch, dus dit is reproduceerbaar.';

create index if not exists kandidaten_organisatie_idx on intel.inhoud_kandidaten (organisatie_id);
create index if not exists kandidaten_gebeurtenis_idx on intel.inhoud_kandidaten (gebeurtenis_id);
create index if not exists kandidaten_cluster_idx on intel.inhoud_kandidaten (onderwerp_cluster_id);
create index if not exists kandidaten_zoekintentie_idx on intel.inhoud_kandidaten (zoekintentie_id);
create index if not exists kandidaten_doelpagina_idx on intel.inhoud_kandidaten (doel_pagina_id);
create index if not exists kandidaten_open_idx
  on intel.inhoud_kandidaten (organisatie_id, totaalscore desc)
  where status = 'open';
create index if not exists kandidaten_beoordeling_gin
  on intel.inhoud_kandidaten using gin (beoordeling jsonb_path_ops);

drop trigger if exists kandidaten_bijgewerkt on intel.inhoud_kandidaten;
create trigger kandidaten_bijgewerkt before update on intel.inhoud_kandidaten
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Inhoudversies
-- ------------------------------------------------------------
create table if not exists intel.inhoud_versies (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  kandidaat_id      bigint references intel.inhoud_kandidaten(id) on delete set null,
  pagina_id         bigint references intel.pagina_register(id) on delete set null,

  pad               text not null,
  versie            integer not null,
  soort             text not null check (soort in (
                      'nieuw_artikel', 'pagina_update', 'regio_patch', 'kennis_update')),

  titel             text not null,
  meta_omschrijving text,
  canonieke_url     text not null,
  -- GEO: een zelfstandig leesbaar direct antwoord bovenaan.
  direct_antwoord   text,
  body_markdown     text not null,
  body_html         text,
  structured_data   jsonb not null default '{}'::jsonb,
  interne_links     jsonb not null default '[]'::jsonb,
  bronnen_sectie    jsonb not null default '[]'::jsonb,
  cta_sleutel       text,

  status            text not null default 'concept' check (status in (
                      'concept', 'ter_review', 'goedgekeurd', 'gepubliceerd',
                      'afgewezen', 'teruggedraaid')),
  risico_klasse     text not null default 'laag' check (risico_klasse in ('laag', 'midden', 'hoog')),

  auteur_soort      text not null check (auteur_soort in ('ai', 'mens')),
  model             text,
  prompt_hash       text,
  invoer_versies    bigint[] not null default '{}',

  -- Uitkomst van alle deterministische poorten, per poort.
  poortresultaten   jsonb not null default '{}'::jsonb,
  poorten_geslaagd  boolean not null default false,

  aangemaakt_door   bigint references intel.gebruikers(id) on delete set null,
  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  constraint inhoud_versies_nummer_uniek unique (organisatie_id, pad, versie)
);

comment on column intel.inhoud_versies.invoer_versies is
  'De bronversies waaruit dit concept is opgebouwd. Verdwijnt een bron, dan is via deze kolom te vinden welke inhoud herbeoordeeld moet worden.';
comment on column intel.inhoud_versies.poortresultaten is
  'Per poort: geslaagd, bevindingen. Een versie zonder poorten_geslaagd kan niet gepubliceerd worden.';

create index if not exists inhoud_versies_organisatie_idx on intel.inhoud_versies (organisatie_id);
create index if not exists inhoud_versies_kandidaat_idx on intel.inhoud_versies (kandidaat_id);
create index if not exists inhoud_versies_pagina_idx on intel.inhoud_versies (pagina_id);
create index if not exists inhoud_versies_auteur_idx on intel.inhoud_versies (aangemaakt_door);
create index if not exists inhoud_versies_pad_idx on intel.inhoud_versies (organisatie_id, pad, versie desc);
create index if not exists inhoud_versies_review_idx
  on intel.inhoud_versies (organisatie_id, aangemaakt_op desc)
  where status in ('concept', 'ter_review');
create index if not exists inhoud_versies_invoer_gin on intel.inhoud_versies using gin (invoer_versies);

drop trigger if exists inhoud_versies_bijgewerkt on intel.inhoud_versies;
create trigger inhoud_versies_bijgewerkt before update on intel.inhoud_versies
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Elke inhoudelijke claim in een versie bindt aan een uitspraak.
-- Dit is wat "traceerbaar naar bewijs" concreet maakt.
-- ------------------------------------------------------------
create table if not exists intel.inhoud_uitspraken (
  organisatie_id   bigint not null references intel.organisaties(id) on delete restrict,
  inhoud_versie_id bigint not null references intel.inhoud_versies(id) on delete cascade,
  uitspraak_id     bigint not null references intel.uitspraken(id) on delete restrict,
  rol              text   not null check (rol in ('kern', 'ondersteunend', 'context')),
  plaats_in_tekst  text,
  primary key (inhoud_versie_id, uitspraak_id)
);

create index if not exists inhoud_uitspraken_uitspraak_idx on intel.inhoud_uitspraken (uitspraak_id);
create index if not exists inhoud_uitspraken_organisatie_idx on intel.inhoud_uitspraken (organisatie_id);

-- ------------------------------------------------------------
-- Publicatiebesluiten: onveranderlijk.
-- ------------------------------------------------------------
create table if not exists intel.publicatiebesluiten (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  inhoud_versie_id  bigint not null references intel.inhoud_versies(id) on delete restrict,
  besluit           text not null check (besluit in (
                      'ingediend', 'goedgekeurd', 'afgewezen', 'gepubliceerd',
                      'teruggedraaid', 'automatisch_geblokkeerd')),
  door_gebruiker_id bigint references intel.gebruikers(id) on delete set null,
  door_rol          text,
  actor_soort       text not null check (actor_soort in ('mens', 'systeem', 'ai', 'cron')),
  motivatie         text,
  poortresultaten   jsonb not null default '{}'::jsonb,
  beleid_versie     text,
  op                timestamptz not null default now()
);

create index if not exists publicatiebesluiten_versie_idx
  on intel.publicatiebesluiten (inhoud_versie_id, op desc);
create index if not exists publicatiebesluiten_organisatie_idx
  on intel.publicatiebesluiten (organisatie_id, op desc);
create index if not exists publicatiebesluiten_gebruiker_idx
  on intel.publicatiebesluiten (door_gebruiker_id);

drop trigger if exists publicatiebesluiten_geen_wijziging on intel.publicatiebesluiten;
create trigger publicatiebesluiten_geen_wijziging
  before update or delete on intel.publicatiebesluiten
  for each statement execute function intel_priv.audit_is_append_only();

-- ------------------------------------------------------------
-- Daadwerkelijke publicaties naar de statische site, met wat er
-- nodig is om terug te draaien.
-- ------------------------------------------------------------
create table if not exists intel.publicaties (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  inhoud_versie_id  bigint not null references intel.inhoud_versies(id) on delete restrict,
  bestandspad       text not null,
  bestand_hash      text not null,
  vorige_bestand_hash text,
  vorige_inhoud     text,
  sitemap_bijgewerkt boolean not null default false,
  zoekmachine_melding jsonb not null default '{}'::jsonb,
  status            text not null default 'geschreven' check (status in (
                      'geschreven', 'teruggedraaid', 'mislukt')),
  fout_bericht      text,
  op                timestamptz not null default now()
);

comment on column intel.publicaties.vorige_inhoud is
  'Volledige vorige bestandsinhoud. Dit is de terugdraaibron; zonder dit is publiceren onomkeerbaar.';

create index if not exists publicaties_versie_idx on intel.publicaties (inhoud_versie_id);
create index if not exists publicaties_organisatie_idx on intel.publicaties (organisatie_id, op desc);
create index if not exists publicaties_pad_idx on intel.publicaties (organisatie_id, bestandspad, op desc);

-- ------------------------------------------------------------
-- Publicatiebeleid per organisatie: wat mag automatisch.
-- Standaard staat alles op voorstellen; dat is een harde eis.
-- ------------------------------------------------------------
create table if not exists intel.publicatiebeleid (
  id                   bigint generated always as identity primary key,
  organisatie_id       bigint not null references intel.organisaties(id) on delete restrict,
  versie               text   not null,
  -- Publiek publiceren zonder mens. Default uit.
  auto_publiceren_aan  boolean not null default false,
  auto_max_risico      text not null default 'laag' check (auto_max_risico in ('laag', 'midden', 'hoog')),
  auto_toegestane_soorten text[] not null default '{}',
  auto_min_bronnen     smallint not null default 2,
  auto_min_bewijskwaliteit smallint not null default 4,
  -- Externe kanalen: nooit automatisch zonder expliciete machtiging.
  linkedin_machtiging  boolean not null default false,
  nieuwsbrief_machtiging boolean not null default false,
  actief               boolean not null default true,
  vastgesteld_door     bigint references intel.gebruikers(id) on delete set null,
  vastgesteld_op       timestamptz not null default now(),

  constraint publicatiebeleid_versie_uniek unique (organisatie_id, versie)
);

comment on table intel.publicatiebeleid is
  'Productie start in propose-only. auto_publiceren_aan mag alleen door een beheerder aan, en dan nog begrenst auto_max_risico het.';

create index if not exists publicatiebeleid_actief_idx
  on intel.publicatiebeleid (organisatie_id) where actief;
create index if not exists publicatiebeleid_vastgesteld_door_idx
  on intel.publicatiebeleid (vastgesteld_door);

-- Hoog risico mag nooit automatisch, ongeacht wat iemand instelt.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'publicatiebeleid_hoog_risico_nooit_automatisch'
      and conrelid = 'intel.publicatiebeleid'::regclass
  ) then
    alter table intel.publicatiebeleid
      add constraint publicatiebeleid_hoog_risico_nooit_automatisch
      check (not (auto_publiceren_aan and auto_max_risico = 'hoog'));
  end if;
end $$;

-- ------------------------------------------------------------
-- Nu pagina_register bestaat: de clusterverwijzing afdwingen.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'onderwerp_clusters_canonieke_pagina_fkey'
      and conrelid = 'intel.onderwerp_clusters'::regclass
  ) then
    -- Kolomlijst bij SET NULL: alleen canonieke_pagina leegmaken.
    -- Zonder die lijst zou organisatie_id ook op NULL gezet worden en
    -- dat is een NOT NULL-kolom, dus zou elke delete falen.
    alter table intel.onderwerp_clusters
      add constraint onderwerp_clusters_canonieke_pagina_fkey
      foreign key (organisatie_id, canonieke_pagina)
      references intel.pagina_register (organisatie_id, pad)
      on delete set null (canonieke_pagina);
  end if;
end $$;

create index if not exists onderwerp_clusters_canonieke_pagina_idx
  on intel.onderwerp_clusters (organisatie_id, canonieke_pagina);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pagina_register', 'zoekintenties', 'inhoud_kandidaten', 'inhoud_versies',
    'inhoud_uitspraken', 'publicatiebesluiten', 'publicaties', 'publicatiebeleid'
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

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant select, insert, update on intel.pagina_register to vibe_intel_app;
grant select, insert, update on intel.zoekintenties to vibe_intel_app;
grant select, insert, update on intel.inhoud_kandidaten to vibe_intel_app;
grant select, insert, update on intel.inhoud_versies to vibe_intel_app;
grant select, insert, update, delete on intel.inhoud_uitspraken to vibe_intel_app;
grant select, insert on intel.publicatiebesluiten to vibe_intel_app;
grant select, insert, update on intel.publicaties to vibe_intel_app;
grant select, insert, update on intel.publicatiebeleid to vibe_intel_app;

grant select on intel.pagina_register, intel.zoekintenties, intel.inhoud_kandidaten,
                intel.inhoud_versies, intel.inhoud_uitspraken, intel.publicatiebesluiten,
                intel.publicaties, intel.publicatiebeleid to vibe_intel_lezer;

grant usage on sequence intel.pagina_register_id_seq,
                        intel.zoekintenties_id_seq,
                        intel.inhoud_kandidaten_id_seq,
                        intel.inhoud_versies_id_seq,
                        intel.publicatiebesluiten_id_seq,
                        intel.publicaties_id_seq,
                        intel.publicatiebeleid_id_seq to vibe_intel_app;
