-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0001 grondslag
-- ------------------------------------------------------------
-- Schema's, rollen, organisatiescope, gebruikers, rechten en
-- het onveranderlijke auditspoor.
--
-- Alles staat in schema `intel` (data) en `intel_priv` (helpers
-- die niet door de applicatierol aangeroepen mogen worden tenzij
-- expliciet toegekend). Het schema `public` blijft leeg.
-- ============================================================

create schema if not exists intel;
create schema if not exists intel_priv;

-- `public` is geen werkschema voor deze applicatie.
revoke all on schema public from public;

-- ------------------------------------------------------------
-- Rollen. Cluster-breed, dus bewust herkenbaar geprefixt.
-- `vibe_intel_app`   : de applicatie. Geen eigenaar, geen superuser,
--                      geen BYPASSRLS. Valt dus onder RLS.
-- `vibe_intel_lezer` : alleen lezen, voor rapportage.
-- Wachtwoorden worden hier nooit gezet; de operator doet dat buiten
-- git om (`alter role ... password`) of de rol wordt via SET ROLE
-- aangenomen vanuit een loginrol.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'vibe_intel_app') then
    create role vibe_intel_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'vibe_intel_lezer') then
    create role vibe_intel_lezer nologin;
  end if;
end $$;

-- Harde eis: de applicatierol mag nooit RLS omzeilen.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'vibe_intel_app' and (rolsuper or rolbypassrls)) then
    raise exception 'vibe_intel_app heeft superuser of BYPASSRLS; dat breekt de organisatiescope';
  end if;
end $$;

grant usage on schema intel to vibe_intel_app, vibe_intel_lezer;
grant usage on schema intel_priv to vibe_intel_app, vibe_intel_lezer;

-- ------------------------------------------------------------
-- Sessiecontext. De applicatie zet `app.organisatie_id` en
-- `app.gebruiker_id` transactielokaal; RLS leest ze hier uit.
-- Ontbreekt de instelling, dan geven de functies NULL en matcht
-- geen enkele rij. Faalt dus dicht.
-- ------------------------------------------------------------
create or replace function intel_priv.huidige_organisatie()
returns bigint
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.organisatie_id', true), '')::bigint
$$;

create or replace function intel_priv.huidige_gebruiker()
returns bigint
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.gebruiker_id', true), '')::bigint
$$;

revoke all on function intel_priv.huidige_organisatie() from public;
revoke all on function intel_priv.huidige_gebruiker() from public;
grant execute on function intel_priv.huidige_organisatie() to vibe_intel_app, vibe_intel_lezer;
grant execute on function intel_priv.huidige_gebruiker() to vibe_intel_app, vibe_intel_lezer;

-- ------------------------------------------------------------
-- Algemene trigger: bijgewerkt_op bijhouden.
-- ------------------------------------------------------------
create or replace function intel_priv.zet_bijgewerkt_op()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.bijgewerkt_op := now();
  return new;
end $$;

revoke all on function intel_priv.zet_bijgewerkt_op() from public;

-- ------------------------------------------------------------
-- Organisaties (tenants).
-- ------------------------------------------------------------
create table if not exists intel.organisaties (
  id            bigint generated always as identity primary key,
  sleutel       text        not null unique,
  naam          text        not null,
  website_host  text,
  actief        boolean     not null default true,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

comment on table intel.organisaties is
  'Tenants. Elke gescoopte tabel verwijst hiernaar via organisatie_id en wordt door RLS begrensd.';

drop trigger if exists organisaties_bijgewerkt on intel.organisaties;
create trigger organisaties_bijgewerkt before update on intel.organisaties
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- ------------------------------------------------------------
-- Gebruikers en rollen.
-- ------------------------------------------------------------
create table if not exists intel.gebruikers (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  email           text   not null,
  naam            text   not null,
  wachtwoord_hash text,
  actief          boolean not null default true,
  laatste_login   timestamptz,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_op   timestamptz not null default now()
);

create unique index if not exists gebruikers_email_uniek
  on intel.gebruikers (lower(email));
create index if not exists gebruikers_organisatie_idx
  on intel.gebruikers (organisatie_id);

drop trigger if exists gebruikers_bijgewerkt on intel.gebruikers;
create trigger gebruikers_bijgewerkt before update on intel.gebruikers
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- Rollen zijn een vaste, in code bekende lijst. Een tabel met een
-- check-constraint in plaats van een enum: uitbreiden kost dan geen
-- type-migratie met een exclusieve lock.
create table if not exists intel.rollen (
  sleutel     text primary key,
  naam        text not null,
  omschrijving text not null,
  rangorde    integer not null
);

create table if not exists intel.gebruiker_rollen (
  gebruiker_id  bigint not null references intel.gebruikers(id) on delete cascade,
  rol           text   not null references intel.rollen(sleutel) on delete restrict,
  toegekend_op  timestamptz not null default now(),
  toegekend_door bigint references intel.gebruikers(id) on delete set null,
  primary key (gebruiker_id, rol)
);

create index if not exists gebruiker_rollen_rol_idx on intel.gebruiker_rollen (rol);
create index if not exists gebruiker_rollen_toegekend_door_idx on intel.gebruiker_rollen (toegekend_door);

-- Rechten per rol. Deterministisch, niet door AI beïnvloedbaar.
create table if not exists intel.rol_rechten (
  rol   text not null references intel.rollen(sleutel) on delete cascade,
  recht text not null,
  primary key (rol, recht)
);

create index if not exists rol_rechten_recht_idx on intel.rol_rechten (recht);

-- ------------------------------------------------------------
-- Onveranderlijk auditspoor.
-- Append-only: update en delete worden zowel via grants als via een
-- trigger geweigerd. De trigger is er voor het geval iemand als
-- eigenaar inlogt; grants houden de applicatierol tegen.
-- ------------------------------------------------------------
create table if not exists intel.audit_gebeurtenissen (
  id             bigint generated always as identity primary key,
  organisatie_id bigint references intel.organisaties(id) on delete restrict,
  op             timestamptz not null default now(),
  actor_soort    text not null check (actor_soort in ('mens', 'systeem', 'ai', 'cron')),
  actor_id       bigint references intel.gebruikers(id) on delete set null,
  actor_naam     text,
  handeling      text not null,
  objectsoort    text not null,
  object_id      text,
  voor_waarde    jsonb,
  na_waarde      jsonb,
  motivatie      text,
  herkomst       text
);

create index if not exists audit_organisatie_op_idx
  on intel.audit_gebeurtenissen (organisatie_id, op desc);
create index if not exists audit_object_idx
  on intel.audit_gebeurtenissen (objectsoort, object_id);
create index if not exists audit_actor_idx
  on intel.audit_gebeurtenissen (actor_id);

create or replace function intel_priv.audit_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'intel.audit_gebeurtenissen is append-only (poging tot %)', tg_op;
end $$;

revoke all on function intel_priv.audit_is_append_only() from public;

drop trigger if exists audit_geen_wijziging on intel.audit_gebeurtenissen;
create trigger audit_geen_wijziging before update or delete on intel.audit_gebeurtenissen
  for each statement execute function intel_priv.audit_is_append_only();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table intel.organisaties        enable row level security;
alter table intel.gebruikers          enable row level security;
alter table intel.gebruiker_rollen    enable row level security;
alter table intel.audit_gebeurtenissen enable row level security;

drop policy if exists organisaties_eigen on intel.organisaties;
create policy organisaties_eigen on intel.organisaties
  for all to vibe_intel_app, vibe_intel_lezer
  using (id = (select intel_priv.huidige_organisatie()))
  with check (id = (select intel_priv.huidige_organisatie()));

drop policy if exists gebruikers_eigen_organisatie on intel.gebruikers;
create policy gebruikers_eigen_organisatie on intel.gebruikers
  for all to vibe_intel_app, vibe_intel_lezer
  using (organisatie_id = (select intel_priv.huidige_organisatie()))
  with check (organisatie_id = (select intel_priv.huidige_organisatie()));

drop policy if exists gebruiker_rollen_eigen_organisatie on intel.gebruiker_rollen;
create policy gebruiker_rollen_eigen_organisatie on intel.gebruiker_rollen
  for all to vibe_intel_app, vibe_intel_lezer
  using (exists (
    select 1 from intel.gebruikers g
    where g.id = gebruiker_rollen.gebruiker_id
      and g.organisatie_id = (select intel_priv.huidige_organisatie())
  ))
  with check (exists (
    select 1 from intel.gebruikers g
    where g.id = gebruiker_rollen.gebruiker_id
      and g.organisatie_id = (select intel_priv.huidige_organisatie())
  ));

drop policy if exists audit_eigen_organisatie on intel.audit_gebeurtenissen;
create policy audit_eigen_organisatie on intel.audit_gebeurtenissen
  for all to vibe_intel_app, vibe_intel_lezer
  using (organisatie_id = (select intel_priv.huidige_organisatie()))
  with check (organisatie_id = (select intel_priv.huidige_organisatie()));

-- ------------------------------------------------------------
-- Grants. Expliciet per tabel; nooit `all privileges`.
-- ------------------------------------------------------------
grant select on intel.organisaties, intel.rollen, intel.rol_rechten to vibe_intel_app, vibe_intel_lezer;
grant select, insert, update on intel.gebruikers to vibe_intel_app;
grant select on intel.gebruikers to vibe_intel_lezer;
grant select, insert, delete on intel.gebruiker_rollen to vibe_intel_app;
grant select on intel.gebruiker_rollen to vibe_intel_lezer;

-- Auditspoor: alleen schrijven en lezen. Geen update, geen delete.
grant select, insert on intel.audit_gebeurtenissen to vibe_intel_app;
grant select on intel.audit_gebeurtenissen to vibe_intel_lezer;
grant usage on sequence intel.audit_gebeurtenissen_id_seq to vibe_intel_app;
grant usage on sequence intel.gebruikers_id_seq to vibe_intel_app;

-- ------------------------------------------------------------
-- Vaste rollen en rechten.
-- ------------------------------------------------------------
insert into intel.rollen (sleutel, naam, omschrijving, rangorde) values
  ('beheerder',  'Beheerder',  'Beheert bronnen, beleid, gebruikers en automatisering.', 100),
  ('redacteur',  'Redacteur',  'Keurt inhoud goed en publiceert; mag geen beleid wijzigen.', 70),
  ('analist',    'Analist',    'Leest alles, maakt concepten, keurt niets goed.', 40),
  ('sales',      'Sales',      'Leest commerciële signalen en briefings.', 30),
  ('lezer',      'Lezer',      'Alleen lezen.', 10)
on conflict (sleutel) do update set
  naam = excluded.naam, omschrijving = excluded.omschrijving, rangorde = excluded.rangorde;

insert into intel.rol_rechten (rol, recht) values
  ('beheerder', 'bron.beheren'),
  ('beheerder', 'beleid.beheren'),
  ('beheerder', 'gebruiker.beheren'),
  ('beheerder', 'inhoud.lezen'),
  ('beheerder', 'inhoud.concept'),
  ('beheerder', 'inhoud.goedkeuren'),
  ('beheerder', 'inhoud.publiceren'),
  ('beheerder', 'inhoud.hoogrisico.goedkeuren'),
  ('beheerder', 'signaal.lezen'),
  ('beheerder', 'distributie.concept'),
  ('beheerder', 'distributie.vrijgeven'),
  ('beheerder', 'pijplijn.bedienen'),
  ('beheerder', 'audit.lezen'),

  ('redacteur', 'inhoud.lezen'),
  ('redacteur', 'inhoud.concept'),
  ('redacteur', 'inhoud.goedkeuren'),
  ('redacteur', 'inhoud.publiceren'),
  ('redacteur', 'signaal.lezen'),
  ('redacteur', 'distributie.concept'),
  ('redacteur', 'distributie.vrijgeven'),
  ('redacteur', 'audit.lezen'),

  ('analist', 'inhoud.lezen'),
  ('analist', 'inhoud.concept'),
  ('analist', 'signaal.lezen'),
  ('analist', 'distributie.concept'),

  ('sales', 'inhoud.lezen'),
  ('sales', 'signaal.lezen'),

  ('lezer', 'inhoud.lezen')
on conflict (rol, recht) do nothing;

comment on table intel.rol_rechten is
  'Deterministische rechtenmatrix. `inhoud.hoogrisico.goedkeuren` zit bewust alleen bij beheerder.';
