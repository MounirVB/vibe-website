-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0003 gebeurtenissen en uitspraken
-- ------------------------------------------------------------
-- De scheiding die het hele platform draagt:
--   BRON -> UITSPRAAK -> GEBEURTENIS -> INTERPRETATIE
-- Een uitspraak zonder bronversie kan niet bevestigd worden; dat
-- wordt door een trigger afgedwongen, niet alleen in code.
--
-- Geografie is referentiedata en bewust NIET organisatiegescoopt.
-- De applicatierol mag die tabel alleen lezen; schrijven gebeurt
-- door de onderhoudsrol. Zo kan geen enkele tenant de geografie
-- van een andere vervuilen.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'vibe_intel_onderhoud') then
    create role vibe_intel_onderhoud nologin;
  end if;
end $$;

grant usage on schema intel to vibe_intel_onderhoud;
grant usage on schema intel_priv to vibe_intel_onderhoud;
grant execute on function intel_priv.huidige_organisatie() to vibe_intel_onderhoud;

-- ------------------------------------------------------------
-- Geografische bereiken (referentiedata)
-- ------------------------------------------------------------
create table if not exists intel.geo_bereiken (
  id             bigint generated always as identity primary key,
  soort          text not null check (soort in (
                   'land', 'provincie', 'gemeente', 'netbeheerdergebied',
                   'congestiegebied', 'bedrijventerrein', 'postcode', 'locatie')),
  code           text not null,
  naam           text not null,
  ouder_id       bigint references intel.geo_bereiken(id) on delete set null,
  netbeheerder   text,
  -- Waar deze grens vandaan komt. Zonder bron geen bereik.
  bron_sleutel   text not null,
  bron_url       text,
  opgehaald_op   timestamptz not null default now(),
  geldig_vanaf   date,
  geldig_tot     date,
  aangemaakt_op  timestamptz not null default now(),
  bijgewerkt_op  timestamptz not null default now(),

  constraint geo_bereiken_code_uniek unique (soort, code)
);

comment on table intel.geo_bereiken is
  'Referentiegeografie uit officiele bronnen (PDOK/CBS). Geen tenantdata: de applicatierol leest alleen.';

create index if not exists geo_bereiken_ouder_idx on intel.geo_bereiken (ouder_id);
create index if not exists geo_bereiken_naam_idx on intel.geo_bereiken (lower(naam));
create index if not exists geo_bereiken_netbeheerder_idx on intel.geo_bereiken (netbeheerder)
  where netbeheerder is not null;

drop trigger if exists geo_bereiken_bijgewerkt on intel.geo_bereiken;
create trigger geo_bereiken_bijgewerkt before update on intel.geo_bereiken
  for each row execute function intel_priv.zet_bijgewerkt_op();

insert into intel.geo_bereiken (soort, code, naam, bron_sleutel)
values ('land', 'NL', 'Nederland', 'handmatig:grondslag')
on conflict (soort, code) do nothing;

-- ------------------------------------------------------------
-- Onderwerpclusters (tenantdata: de taxonomie van Vibe zelf)
-- ------------------------------------------------------------
create table if not exists intel.onderwerp_clusters (
  id             bigint generated always as identity primary key,
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  sleutel        text   not null,
  naam           text   not null,
  omschrijving   text,
  ouder_id       bigint references intel.onderwerp_clusters(id) on delete set null,
  -- De pagina die de zoekintentie van dit cluster bezit. Verwijst naar
  -- intel.pagina_register; de sleutel wordt in 0004 als constraint gezet.
  canonieke_pagina text,
  risico_klasse  text not null default 'laag' check (risico_klasse in ('laag', 'midden', 'hoog')),
  aangemaakt_op  timestamptz not null default now(),
  bijgewerkt_op  timestamptz not null default now(),

  constraint onderwerp_clusters_sleutel_uniek unique (organisatie_id, sleutel)
);

comment on column intel.onderwerp_clusters.risico_klasse is
  'Clusters als subsidie, batterijveiligheid en rendement zijn hoog risico: inhoud daarover kan nooit automatisch publiceren.';

create index if not exists onderwerp_clusters_organisatie_idx on intel.onderwerp_clusters (organisatie_id);
create index if not exists onderwerp_clusters_ouder_idx on intel.onderwerp_clusters (ouder_id);

drop trigger if exists onderwerp_clusters_bijgewerkt on intel.onderwerp_clusters;
create trigger onderwerp_clusters_bijgewerkt before update on intel.onderwerp_clusters
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Marktgebeurtenissen
-- ------------------------------------------------------------
create table if not exists intel.markt_gebeurtenissen (
  id                    bigint generated always as identity primary key,
  organisatie_id        bigint not null references intel.organisaties(id) on delete restrict,
  -- Dedupsleutel: afgeleid van genormaliseerde titel + onderwerp + datum.
  sleutel               text   not null,
  titel                 text   not null,
  -- Eigen formulering. Nooit de brontekst.
  samenvatting          text,
  gebeurtenis_soort     text   not null check (gebeurtenis_soort in (
                          'regelgeving', 'subsidie', 'netcongestie', 'marktprijs',
                          'infrastructuur', 'techniek', 'vastgoedontwikkeling',
                          'aanbesteding', 'vergunning', 'statistiek', 'overig')),
  gebeurd_op            timestamptz,
  eerst_gezien_op       timestamptz not null default now(),
  laatst_bijgewerkt_op  timestamptz not null default now(),

  materialiteit         smallint not null default 0 check (materialiteit between 0 and 100),
  materialiteit_grondslag jsonb not null default '{}'::jsonb,

  status                text not null default 'nieuw' check (status in (
                          'nieuw', 'verrijkt', 'beoordeeld', 'afgehandeld', 'afgewezen')),
  onderwerp_cluster_id  bigint references intel.onderwerp_clusters(id) on delete set null,
  risico_klasse         text not null default 'laag' check (risico_klasse in ('laag', 'midden', 'hoog')),

  aantal_bronnen        integer not null default 0,
  heeft_tegenspraak     boolean not null default false,

  aangemaakt_op         timestamptz not null default now(),
  bijgewerkt_op         timestamptz not null default now(),

  constraint markt_gebeurtenissen_sleutel_uniek unique (organisatie_id, sleutel)
);

comment on column intel.markt_gebeurtenissen.samenvatting is
  'Eigen formulering op basis van geverifieerde uitspraken. Kopieren van brontekst is een poortfout.';

create index if not exists gebeurtenissen_organisatie_idx on intel.markt_gebeurtenissen (organisatie_id);
create index if not exists gebeurtenissen_status_idx
  on intel.markt_gebeurtenissen (organisatie_id, status, materialiteit desc);
create index if not exists gebeurtenissen_gebeurd_idx
  on intel.markt_gebeurtenissen (organisatie_id, gebeurd_op desc nulls last);
create index if not exists gebeurtenissen_cluster_idx on intel.markt_gebeurtenissen (onderwerp_cluster_id);
create index if not exists gebeurtenissen_open_idx
  on intel.markt_gebeurtenissen (organisatie_id, eerst_gezien_op desc)
  where status in ('nieuw', 'verrijkt');

drop trigger if exists gebeurtenissen_bijgewerkt on intel.markt_gebeurtenissen;
create trigger gebeurtenissen_bijgewerkt before update on intel.markt_gebeurtenissen
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- Koppeling gebeurtenis <-> bronversie. Meerdere bronnen per
-- gebeurtenis is normaal; dat is juist het bewijs.
create table if not exists intel.gebeurtenis_documenten (
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id  bigint not null references intel.markt_gebeurtenissen(id) on delete cascade,
  brondocument_id bigint not null references intel.brondocumenten(id) on delete cascade,
  versie_id       bigint not null references intel.brondocument_versies(id) on delete cascade,
  rol             text   not null check (rol in ('primair', 'bevestigend', 'tegensprekend')),
  toegevoegd_op   timestamptz not null default now(),
  primary key (gebeurtenis_id, versie_id)
);

create index if not exists gebeurtenis_documenten_document_idx
  on intel.gebeurtenis_documenten (brondocument_id);
create index if not exists gebeurtenis_documenten_versie_idx
  on intel.gebeurtenis_documenten (versie_id);
create index if not exists gebeurtenis_documenten_organisatie_idx
  on intel.gebeurtenis_documenten (organisatie_id);

-- ------------------------------------------------------------
-- Uitspraken (atomaire claims)
-- ------------------------------------------------------------
create table if not exists intel.uitspraken (
  id                   bigint generated always as identity primary key,
  organisatie_id       bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id       bigint references intel.markt_gebeurtenissen(id) on delete set null,

  tekst                text not null,
  soort                text not null check (soort in (
                         'feit', 'cijfer', 'datum', 'regel', 'prijs', 'specificatie', 'status')),
  waarde_numeriek      numeric,
  eenheid              text,
  onderwerp            text,

  -- Houdbaarheid. Een uitspraak zonder geldig_tot is niet automatisch
  -- eeuwig geldig: hersien_voor dwingt herbeoordeling af.
  geldig_vanaf         date,
  geldig_tot           date,
  hersien_voor         date,
  laatst_geverifieerd_op timestamptz,

  verificatie_status   text not null default 'ongeverifieerd' check (verificatie_status in (
                         'ongeverifieerd', 'bevestigd', 'tegengesproken', 'verlopen', 'ingetrokken')),
  bewijs_kwaliteit     smallint not null default 1 check (bewijs_kwaliteit between 1 and 5),
  risico_klasse        text not null default 'laag' check (risico_klasse in ('laag', 'midden', 'hoog')),

  -- Interpretatie is expliciet gescheiden van het feit.
  is_interpretatie     boolean not null default false,
  interpretatie_door   text check (interpretatie_door in ('ai', 'mens')),

  aangemaakt_op        timestamptz not null default now(),
  bijgewerkt_op        timestamptz not null default now(),

  constraint uitspraken_geldigheid_logisch
    check (geldig_tot is null or geldig_vanaf is null or geldig_tot >= geldig_vanaf),
  constraint uitspraken_interpretatie_heeft_auteur
    check (not is_interpretatie or interpretatie_door is not null)
);

comment on column intel.uitspraken.is_interpretatie is
  'True = dit is onze gevolgtrekking, geen extern geverifieerd feit. Mag nooit als feit gepubliceerd worden.';
comment on column intel.uitspraken.hersien_voor is
  'Datum waarop deze uitspraak opnieuw tegen de bron gehouden moet worden. Subsidie- en netclaims krijgen een korte termijn.';

create index if not exists uitspraken_organisatie_idx on intel.uitspraken (organisatie_id);
create index if not exists uitspraken_gebeurtenis_idx on intel.uitspraken (gebeurtenis_id);
create index if not exists uitspraken_status_idx
  on intel.uitspraken (organisatie_id, verificatie_status, risico_klasse);
create index if not exists uitspraken_herziening_idx
  on intel.uitspraken (organisatie_id, hersien_voor)
  where verificatie_status = 'bevestigd' and hersien_voor is not null;
create index if not exists uitspraken_verloop_idx
  on intel.uitspraken (organisatie_id, geldig_tot)
  where geldig_tot is not null and verificatie_status = 'bevestigd';

drop trigger if exists uitspraken_bijgewerkt on intel.uitspraken;
create trigger uitspraken_bijgewerkt before update on intel.uitspraken
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- Herkomst van een uitspraak: altijd naar een concrete bronversie.
create table if not exists intel.uitspraak_bronnen (
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  uitspraak_id   bigint not null references intel.uitspraken(id) on delete cascade,
  versie_id      bigint not null references intel.brondocument_versies(id) on delete cascade,
  rol            text   not null check (rol in ('primair', 'bevestigend', 'tegensprekend')),
  vindplaats     text,
  citaat         text,
  toegevoegd_op  timestamptz not null default now(),
  primary key (uitspraak_id, versie_id)
);

comment on column intel.uitspraak_bronnen.citaat is
  'Alleen gevuld als bronnen.mag_citeren waar is en binnen citaat_limiet_tekens.';

create index if not exists uitspraak_bronnen_versie_idx on intel.uitspraak_bronnen (versie_id);
create index if not exists uitspraak_bronnen_organisatie_idx on intel.uitspraak_bronnen (organisatie_id);
create index if not exists uitspraak_bronnen_primair_idx
  on intel.uitspraak_bronnen (uitspraak_id) where rol = 'primair';

-- ------------------------------------------------------------
-- Bewijsgebonden geografie.
-- `grondslag` is het hele punt: 'afgeleid' mag nooit een harde
-- netclaim dragen. Dat wordt in de publicatiepoort afgedwongen en
-- hier zichtbaar vastgelegd.
-- ------------------------------------------------------------
create table if not exists intel.uitspraak_geo (
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  uitspraak_id   bigint not null references intel.uitspraken(id) on delete cascade,
  geo_bereik_id  bigint not null references intel.geo_bereiken(id) on delete restrict,
  grondslag      text   not null check (grondslag in ('bron_expliciet', 'code_match', 'afgeleid')),
  bewijs         text   not null,
  versie_id      bigint references intel.brondocument_versies(id) on delete set null,
  toegevoegd_op  timestamptz not null default now(),
  primary key (uitspraak_id, geo_bereik_id)
);

comment on column intel.uitspraak_geo.grondslag is
  'bron_expliciet = de bron noemt dit gebied zelf. code_match = exacte CBS/postcode-match uit de bron. afgeleid = onze gevolgtrekking, nooit genoeg voor een netcapaciteitsclaim.';
comment on column intel.uitspraak_geo.bewijs is
  'Letterlijke onderbouwing: welke veldwaarde of welke zin in welke bronversie dit gebied noemt.';

create index if not exists uitspraak_geo_bereik_idx on intel.uitspraak_geo (geo_bereik_id);
create index if not exists uitspraak_geo_organisatie_idx on intel.uitspraak_geo (organisatie_id);

create table if not exists intel.gebeurtenis_geo (
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id bigint not null references intel.markt_gebeurtenissen(id) on delete cascade,
  geo_bereik_id  bigint not null references intel.geo_bereiken(id) on delete restrict,
  grondslag      text   not null check (grondslag in ('bron_expliciet', 'code_match', 'afgeleid')),
  bewijs         text   not null,
  toegevoegd_op  timestamptz not null default now(),
  primary key (gebeurtenis_id, geo_bereik_id)
);

create index if not exists gebeurtenis_geo_bereik_idx on intel.gebeurtenis_geo (geo_bereik_id);
create index if not exists gebeurtenis_geo_organisatie_idx on intel.gebeurtenis_geo (organisatie_id);

-- ------------------------------------------------------------
-- Databasezijdige bewijsplicht.
-- Een uitspraak mag niet op 'bevestigd' staan zonder minstens een
-- primaire bronversie. Dit is geen applicatieregel maar een trigger,
-- zodat ook een los script het niet kan omzeilen.
-- ------------------------------------------------------------
create or replace function intel_priv.uitspraak_vereist_bewijs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.verificatie_status = 'bevestigd' then
    if not exists (
      select 1 from intel.uitspraak_bronnen ub
      where ub.uitspraak_id = new.id and ub.rol = 'primair'
    ) then
      raise exception
        'uitspraak % kan niet bevestigd worden zonder primaire bronversie', new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

revoke all on function intel_priv.uitspraak_vereist_bewijs() from public;

drop trigger if exists uitspraken_bewijsplicht on intel.uitspraken;
create constraint trigger uitspraken_bewijsplicht
  after insert or update of verificatie_status on intel.uitspraken
  deferrable initially deferred
  for each row execute function intel_priv.uitspraak_vereist_bewijs();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table intel.onderwerp_clusters    enable row level security;
alter table intel.markt_gebeurtenissen  enable row level security;
alter table intel.gebeurtenis_documenten enable row level security;
alter table intel.uitspraken            enable row level security;
alter table intel.uitspraak_bronnen     enable row level security;
alter table intel.uitspraak_geo         enable row level security;
alter table intel.gebeurtenis_geo       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'onderwerp_clusters', 'markt_gebeurtenissen', 'gebeurtenis_documenten',
    'uitspraken', 'uitspraak_bronnen', 'uitspraak_geo', 'gebeurtenis_geo'
  ]
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

-- geo_bereiken heeft bewust geen RLS: het is gedeelde referentiedata.
-- De bescherming zit in de grants — de applicatierol mag niet schrijven.

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant select on intel.geo_bereiken to vibe_intel_app, vibe_intel_lezer;
grant select, insert, update on intel.geo_bereiken to vibe_intel_onderhoud;
grant usage on sequence intel.geo_bereiken_id_seq to vibe_intel_onderhoud;

grant select, insert, update on intel.onderwerp_clusters to vibe_intel_app;
grant select, insert, update on intel.markt_gebeurtenissen to vibe_intel_app;
grant select, insert, update, delete on intel.gebeurtenis_documenten to vibe_intel_app;
grant select, insert, update on intel.uitspraken to vibe_intel_app;
grant select, insert, update, delete on intel.uitspraak_bronnen to vibe_intel_app;
grant select, insert, update, delete on intel.uitspraak_geo to vibe_intel_app;
grant select, insert, update, delete on intel.gebeurtenis_geo to vibe_intel_app;

grant select on intel.onderwerp_clusters, intel.markt_gebeurtenissen,
                intel.gebeurtenis_documenten, intel.uitspraken,
                intel.uitspraak_bronnen, intel.uitspraak_geo,
                intel.gebeurtenis_geo to vibe_intel_lezer;

grant usage on sequence intel.onderwerp_clusters_id_seq,
                        intel.markt_gebeurtenissen_id_seq,
                        intel.uitspraken_id_seq to vibe_intel_app;
