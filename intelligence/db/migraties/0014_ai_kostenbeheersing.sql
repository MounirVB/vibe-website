-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0014 AI-kostenbeheersing
-- ------------------------------------------------------------
-- WAAROM:       Release 2.1 had een DAGplafond op het aantal
--               AI-aanroepen en niets daarboven. Drie gaten die in
--               productie geld kosten:
--
--               1 GEEN MAANDPLAFOND. Een dagplafond van 200 aanroepen
--                 is 6.000 per maand. Een dag met een vastgelopen
--                 wachtrij die elke ronde opnieuw genereert blijft
--                 binnen het dagplafond en loopt toch dertig dagen
--                 door.
--
--               2 GEEN KOSTENPLAFOND, alleen een aantallenplafond.
--                 Aantallen zijn geen kosten: een aanroep met 200
--                 uitvoertokens en een met 8.000 kosten hetzelfde in
--                 de teller en een factor veertig op de rekening.
--
--               3 GEEN STROOMONDERBREKER. Bij een provider die
--                 structureel faalt bleef elke taak het opnieuw
--                 proberen tot zijn pogingen op waren. Dat is geld
--                 betalen voor mislukte aanroepen.
--
--               De kolom kosten_bron in ai_aanroepen bestond al en
--               houdt het verschil bij tussen een GEMETEN tarief en
--               'onbekend'. Dat verschil blijft hier overeind: een
--               kostenplafond kan alleen handhaven op aanroepen
--               waarvoor een tarief in intel.ai_prijzen staat, en die
--               tabel is leeg tot iemand een tarief MET bron-URL en
--               meetdatum invoert.
--
-- ADDITIVE:     JA — drie kolommen op een bestaande tabel plus één
--               nieuwe tabel. Geen bestaande kolom wijzigt van type of
--               van betekenis.
-- IDEMPOTENT:   JA — add column if not exists, create table if not
--               exists, en de constraints achter een pg_constraint-check.
-- DESTRUCTIEF:  NEE. Bestaande rijen in kostenplafonds krijgen NULL in
--               de nieuwe kolommen, en NULL betekent hier expliciet
--               "geen plafond" — hetzelfde gedrag als voor deze
--               migratie. Er verandert dus niets tenzij iemand een
--               waarde zet.
-- ROLLBACK:     Voorwaarts. Terugdraaien zou zijn:
--                 drop table if exists intel.ai_stroomonderbreker;
--                 alter table intel.kostenplafonds
--                   drop column if exists max_ai_aanroepen_per_maand,
--                   drop column if exists max_tokens_uit_per_maand,
--                   drop column if exists max_kosten_per_maand;
--               Dat is veilig omdat er geen afgeleide data in zit; de
--               geschiedenis staat in ai_aanroepen en blijft staan.
-- ============================================================

-- ------------------------------------------------------------
-- Maandplafonds. NULL = geen plafond, net als voor deze migratie.
-- ------------------------------------------------------------
alter table intel.kostenplafonds
  add column if not exists max_ai_aanroepen_per_maand integer,
  add column if not exists max_tokens_uit_per_maand   bigint,
  add column if not exists max_kosten_per_maand       numeric(12, 4);

comment on column intel.kostenplafonds.max_ai_aanroepen_per_maand is
  'NULL = geen maandplafond. Staat naast het dagplafond omdat een dagplafond dertig dagen lang gehaald kan worden.';
comment on column intel.kostenplafonds.max_tokens_uit_per_maand is
  'NULL = geen plafond. Tokens en niet aanroepen, want een aanroep met 8.000 uitvoertokens kost veertig keer een aanroep met 200.';
comment on column intel.kostenplafonds.max_kosten_per_maand is
  'NULL = geen plafond. Handhaafbaar ALLEEN op aanroepen met een gemeten tarief in intel.ai_prijzen; zonder tarief blijven kosten ONBEKEND en telt deze grens niet mee.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'kostenplafonds_maand_positief'
                    and conrelid = 'intel.kostenplafonds'::regclass) then
    alter table intel.kostenplafonds add constraint kostenplafonds_maand_positief
      check (
        (max_ai_aanroepen_per_maand is null or max_ai_aanroepen_per_maand > 0)
        and (max_tokens_uit_per_maand is null or max_tokens_uit_per_maand > 0)
        and (max_kosten_per_maand is null or max_kosten_per_maand > 0)
      );
  end if;

  -- Een maandplafond dat onder het dagplafond ligt is een
  -- configuratiefout: dan is de eerste dag al de hele maand.
  if not exists (select 1 from pg_constraint
                  where conname = 'kostenplafonds_maand_boven_dag'
                    and conrelid = 'intel.kostenplafonds'::regclass) then
    alter table intel.kostenplafonds add constraint kostenplafonds_maand_boven_dag
      check (
        max_ai_aanroepen_per_maand is null
        or max_ai_aanroepen_per_maand >= max_ai_aanroepen_per_dag
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- De stroomonderbreker.
-- ------------------------------------------------------------
-- Eén rij per organisatie per onderdeel. `open_tot` in de toekomst
-- betekent: nu niet aanroepen. Een tijdstip en geen booleaanse vlag,
-- om dezelfde reden als bij de wachtrijlease: een vlag die door een
-- crash aan blijft staan zet het onderdeel voor altijd uit, en dan is
-- de onderbreker zelf de storing geworden.
create table if not exists intel.ai_stroomonderbreker (
  organisatie_id bigint not null references intel.organisaties(id) on delete restrict,
  onderdeel      text   not null,

  open_tot       timestamptz,
  reden          text,
  geopend_op     timestamptz,
  keer_geopend   integer not null default 0,

  -- Tellers sinds de laatste reset, voor de drempel.
  mislukt_achtereen integer not null default 0,

  bijgewerkt_op  timestamptz not null default now(),

  primary key (organisatie_id, onderdeel),
  constraint ai_stroomonderbreker_open_heeft_reden
    check (open_tot is null or reden is not null)
);

comment on table intel.ai_stroomonderbreker is
  'Stroomonderbreker per onderdeel. open_tot in de toekomst betekent: nu geen aanroepen doen. Een tijdstip en geen vlag, zodat een crash het onderdeel niet voor altijd uitzet.';

create index if not exists ai_stroomonderbreker_open_idx
  on intel.ai_stroomonderbreker (organisatie_id)
  where open_tot is not null;

-- RLS, net als elke tabel met een organisatie_id.
alter table intel.ai_stroomonderbreker enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'intel' and tablename = 'ai_stroomonderbreker'
                    and policyname = 'ai_stroomonderbreker_eigen_organisatie') then
    create policy ai_stroomonderbreker_eigen_organisatie on intel.ai_stroomonderbreker
      using (organisatie_id = (select intel_priv.huidige_organisatie()))
      with check (organisatie_id = (select intel_priv.huidige_organisatie()));
  end if;
end $$;

grant select, insert, update on intel.ai_stroomonderbreker to vibe_intel_app;
grant select on intel.ai_stroomonderbreker to vibe_intel_lezer;

-- ------------------------------------------------------------
-- Modelallowlist.
-- ------------------------------------------------------------
-- Welke modellen mogen aangeroepen worden. Bewust een TABEL en niet
-- een lijst in code: een nieuw model toestaan is een besluit met een
-- datum en een reden, en dat hoort naast de prijsregel te staan.
create table if not exists intel.ai_toegestane_modellen (
  provider      text not null,
  model         text not null,
  toegestaan_op date not null default current_date,
  reden         text not null,
  primary key (provider, model)
);

comment on table intel.ai_toegestane_modellen is
  'Allowlist. Een model dat hier niet in staat wordt niet aangeroepen, ook niet als de configuratie hem noemt. Leeg = niets toegestaan.';

grant select on intel.ai_toegestane_modellen to vibe_intel_app, vibe_intel_lezer;

-- Deze tabel heeft geen organisatie_id: welk model technisch
-- aanroepbaar is, is geen tenantgegeven. Daarom in de
-- uitzonderingslijst, zodat de invariantencontrole hem niet als
-- vergeten RLS aanmerkt.
-- ai_stroomonderbreker staat hier NIET in: die heeft een
-- organisatie_id en dus gewoon RLS.
insert into intel.rls_uitzonderingen (tabelnaam, reden)
values ('ai_toegestane_modellen', 'modelallowlist, gedeeld en alleen leesbaar voor de app')
on conflict (tabelnaam) do nothing;
