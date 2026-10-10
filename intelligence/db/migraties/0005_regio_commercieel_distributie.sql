-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0005 regio, commercieel, distributie
-- ------------------------------------------------------------
-- Regionale impact als patchvoorstel (nooit als automatisch
-- gegenereerde massapagina), commerciele signalen met een harde
-- scheiding tussen geverifieerd feit en hypothese, en
-- kanaalconcepten die niet zelf kunnen verzenden.
-- ============================================================

-- ------------------------------------------------------------
-- Regionale impact
-- ------------------------------------------------------------
create table if not exists intel.regio_impacts (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id    bigint not null references intel.markt_gebeurtenissen(id) on delete cascade,
  geo_bereik_id     bigint not null references intel.geo_bereiken(id) on delete restrict,
  pagina_id         bigint references intel.pagina_register(id) on delete set null,

  impact_soort      text not null check (impact_soort in (
                      'netcapaciteit', 'subsidie', 'regelgeving', 'marktprijs',
                      'infrastructuur', 'vastgoedontwikkeling')),
  -- Zelfde grondslagladder als bij uitspraken. 'afgeleid' is nooit
  -- genoeg voor een netcapaciteitsuitspraak over een gebied.
  grondslag         text not null check (grondslag in ('bron_expliciet', 'code_match', 'afgeleid')),
  bewijs            text not null,

  voorgestelde_patch jsonb not null default '{}'::jsonb,
  samenvatting      text,

  status            text not null default 'voorstel' check (status in (
                      'voorstel', 'goedgekeurd', 'toegepast', 'afgewezen', 'vervallen')),
  -- Release 1 bepaalt of een regioroute publicatiegereed is. Een
  -- nieuwsgebeurtenis mag die poort niet openzetten.
  release1_gereed   boolean not null default false,

  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  constraint regio_impacts_uniek unique (gebeurtenis_id, geo_bereik_id, impact_soort)
);

comment on column intel.regio_impacts.release1_gereed is
  'Overgenomen uit het routeregister van Release 1. False betekent: patch mag niet toegepast worden, hoe materieel de gebeurtenis ook is.';
comment on column intel.regio_impacts.voorgestelde_patch is
  'Een voorstel, geen pagina. Honderden bijna identieke artikelen genereren is expliciet geen toegestane uitkomst.';

create index if not exists regio_impacts_organisatie_idx on intel.regio_impacts (organisatie_id);
create index if not exists regio_impacts_gebeurtenis_idx on intel.regio_impacts (gebeurtenis_id);
create index if not exists regio_impacts_geo_idx on intel.regio_impacts (geo_bereik_id);
create index if not exists regio_impacts_pagina_idx on intel.regio_impacts (pagina_id);
create index if not exists regio_impacts_open_idx
  on intel.regio_impacts (organisatie_id, aangemaakt_op desc)
  where status = 'voorstel';

drop trigger if exists regio_impacts_bijgewerkt on intel.regio_impacts;
create trigger regio_impacts_bijgewerkt before update on intel.regio_impacts
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- Een netcapaciteitspatch op een afgeleide grondslag mag niet bestaan.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'regio_impacts_netclaim_vereist_bronbewijs'
      and conrelid = 'intel.regio_impacts'::regclass
  ) then
    alter table intel.regio_impacts
      add constraint regio_impacts_netclaim_vereist_bronbewijs
      check (impact_soort <> 'netcapaciteit' or grondslag in ('bron_expliciet', 'code_match'));
  end if;
end $$;

-- ------------------------------------------------------------
-- Commerciele signalen.
--
-- AVG: dit zijn organisatie- en projectgegevens uit openbare
-- publicaties. Persoonsgegevens horen hier niet; dat is een
-- constraint, geen afspraak. Er bestaat in dit platform geen
-- verzendpad, dus autonome outreach is technisch onmogelijk.
-- ------------------------------------------------------------
create table if not exists intel.commerciele_signalen (
  id                 bigint generated always as identity primary key,
  organisatie_id     bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id     bigint references intel.markt_gebeurtenissen(id) on delete set null,
  geo_bereik_id      bigint references intel.geo_bereiken(id) on delete restrict,

  subject_naam       text not null,
  subject_soort      text not null check (subject_soort in (
                       'organisatie', 'project', 'locatie', 'aanbesteding')),
  kvk_nummer         text,

  -- Het geverifieerde feit, los van wat wij eruit concluderen.
  geverifieerde_gebeurtenis text not null,
  gebeurtenis_datum  date,
  verificatie_status text not null default 'onbevestigd' check (verificatie_status in (
                       'geverifieerd', 'onbevestigd', 'afgewezen')),

  -- De interpretatie, expliciet als hypothese gelabeld.
  energie_uitdaging  text,
  relevante_oplossingen text[] not null default '{}',
  is_hypothese       boolean not null default true,
  vertrouwen         text not null default 'laag' check (vertrouwen in ('laag', 'midden', 'hoog')),
  commerciele_prioriteit smallint not null default 0 check (commerciele_prioriteit between 0 and 100),
  aanbevolen_actie   text,

  -- Harde grenzen
  bevat_persoonsgegevens boolean not null default false,
  interesse_bewezen  boolean not null default false,
  avg_grondslag      text not null default 'openbare_bron',

  status             text not null default 'nieuw' check (status in (
                       'nieuw', 'in_behandeling', 'gekwalificeerd', 'afgewezen', 'vervallen')),
  toegewezen_aan     bigint references intel.gebruikers(id) on delete set null,

  aangemaakt_op      timestamptz not null default now(),
  bijgewerkt_op      timestamptz not null default now()
);

comment on column intel.commerciele_signalen.is_hypothese is
  'True zolang de energie-uitdaging onze gevolgtrekking is. Een signaal is geen lead.';
comment on column intel.commerciele_signalen.interesse_bewezen is
  'Alleen true als er bewijs van daadwerkelijke interesse is (bijvoorbeeld een eigen aanvraag). Nooit door de pijplijn gezet.';
comment on column intel.commerciele_signalen.bevat_persoonsgegevens is
  'Moet false blijven. De constraint hieronder maakt true onmogelijk; persoonsgegevens horen niet in deze tabel.';

create index if not exists signalen_organisatie_idx on intel.commerciele_signalen (organisatie_id);
create index if not exists signalen_gebeurtenis_idx on intel.commerciele_signalen (gebeurtenis_id);
create index if not exists signalen_geo_idx on intel.commerciele_signalen (geo_bereik_id);
create index if not exists signalen_toegewezen_idx on intel.commerciele_signalen (toegewezen_aan);
create index if not exists signalen_prioriteit_idx
  on intel.commerciele_signalen (organisatie_id, commerciele_prioriteit desc)
  where status in ('nieuw', 'in_behandeling');

drop trigger if exists signalen_bijgewerkt on intel.commerciele_signalen;
create trigger signalen_bijgewerkt before update on intel.commerciele_signalen
  for each row execute function intel_priv.zet_bijgewerkt_op();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'signalen_geen_persoonsgegevens'
      and conrelid = 'intel.commerciele_signalen'::regclass
  ) then
    alter table intel.commerciele_signalen
      add constraint signalen_geen_persoonsgegevens
      check (bevat_persoonsgegevens = false);
  end if;

  -- Gekwalificeerd mag alleen met een geverifieerd feit eronder.
  if not exists (
    select 1 from pg_constraint
    where conname = 'signalen_kwalificatie_vereist_verificatie'
      and conrelid = 'intel.commerciele_signalen'::regclass
  ) then
    alter table intel.commerciele_signalen
      add constraint signalen_kwalificatie_vereist_verificatie
      check (status <> 'gekwalificeerd' or verificatie_status = 'geverifieerd');
  end if;
end $$;

-- Herkomst van een signaal: altijd naar bronversies.
create table if not exists intel.signaal_bronnen (
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  signaal_id     bigint not null references intel.commerciele_signalen(id) on delete cascade,
  versie_id      bigint not null references intel.brondocument_versies(id) on delete cascade,
  rol            text   not null check (rol in ('primair', 'bevestigend')),
  vindplaats     text,
  toegevoegd_op  timestamptz not null default now(),
  primary key (signaal_id, versie_id)
);

create index if not exists signaal_bronnen_versie_idx on intel.signaal_bronnen (versie_id);
create index if not exists signaal_bronnen_organisatie_idx on intel.signaal_bronnen (organisatie_id);

-- ------------------------------------------------------------
-- Distributieconcepten.
-- Er is geen verzendcode in dit platform. `vrijgegeven` betekent
-- hoogstens: een mens mag dit kopieren en zelf plaatsen.
-- ------------------------------------------------------------
create table if not exists intel.distributie_concepten (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  inhoud_versie_id  bigint references intel.inhoud_versies(id) on delete cascade,
  gebeurtenis_id    bigint references intel.markt_gebeurtenissen(id) on delete cascade,

  kanaal            text not null check (kanaal in (
                      'website_nieuws', 'linkedin', 'nieuwsbrief',
                      'sales_briefing', 'team_update', 'campagne_concept')),
  titel             text not null,
  body              text not null,
  bronvermelding    jsonb not null default '[]'::jsonb,
  -- Betekenisbewaking: de gebruikte uitspraken moeten dezelfde zijn
  -- als in de bronversie van de inhoud.
  uitspraak_ids     bigint[] not null default '{}',

  status            text not null default 'concept' check (status in (
                      'concept', 'ter_review', 'vrijgegeven', 'afgewezen', 'verlopen')),
  gepland_voor      timestamptz,
  machtiging_bewijs text,

  aangemaakt_door   bigint references intel.gebruikers(id) on delete set null,
  vrijgegeven_door  bigint references intel.gebruikers(id) on delete set null,
  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now()
);

comment on table intel.distributie_concepten is
  'Concepten voor kanalen. Het platform bevat geen verzend- of postcode; vrijgeven is een redactioneel besluit, geen publicatie.';
comment on column intel.distributie_concepten.machtiging_bewijs is
  'Voor linkedin en nieuwsbrief: verwijzing naar het vastgestelde kanaalbeleid dat dit toestaat. Leeg = niet vrijgeven.';

create index if not exists distributie_organisatie_idx on intel.distributie_concepten (organisatie_id);
create index if not exists distributie_inhoud_idx on intel.distributie_concepten (inhoud_versie_id);
create index if not exists distributie_gebeurtenis_idx on intel.distributie_concepten (gebeurtenis_id);
create index if not exists distributie_auteur_idx on intel.distributie_concepten (aangemaakt_door);
create index if not exists distributie_vrijgever_idx on intel.distributie_concepten (vrijgegeven_door);
create index if not exists distributie_review_idx
  on intel.distributie_concepten (organisatie_id, aangemaakt_op desc)
  where status in ('concept', 'ter_review');

drop trigger if exists distributie_bijgewerkt on intel.distributie_concepten;
create trigger distributie_bijgewerkt before update on intel.distributie_concepten
  for each row execute function intel_priv.zet_bijgewerkt_op();

-- Externe kanalen vereisen vastgelegde machtiging om vrijgegeven te worden.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'distributie_extern_vereist_machtiging'
      and conrelid = 'intel.distributie_concepten'::regclass
  ) then
    alter table intel.distributie_concepten
      add constraint distributie_extern_vereist_machtiging
      check (
        status <> 'vrijgegeven'
        or kanaal not in ('linkedin', 'nieuwsbrief')
        or machtiging_bewijs is not null
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- RLS en grants
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'regio_impacts', 'commerciele_signalen', 'signaal_bronnen', 'distributie_concepten'
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

grant select, insert, update on intel.regio_impacts to vibe_intel_app;
grant select, insert, update on intel.commerciele_signalen to vibe_intel_app;
grant select, insert, update, delete on intel.signaal_bronnen to vibe_intel_app;
grant select, insert, update on intel.distributie_concepten to vibe_intel_app;

grant select on intel.regio_impacts, intel.commerciele_signalen,
                intel.signaal_bronnen, intel.distributie_concepten to vibe_intel_lezer;

grant usage on sequence intel.regio_impacts_id_seq,
                        intel.commerciele_signalen_id_seq,
                        intel.distributie_concepten_id_seq to vibe_intel_app;
