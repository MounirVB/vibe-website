-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0049 GEO: zichtbaarheid in AI-antwoorden
-- ------------------------------------------------------------
-- WAAROM:       'GEO' betekende in deze repository tot nu toe overal
--               GEOGRAFIE. intel.geo_bereiken is een regiotabel,
--               intel.gebeurtenis_geo en intel.uitspraak_geo dragen
--               geografisch bewijs, en src/cli/geo.ts synchroniseert
--               gebiedsgrenzen. Gemeten op 1 november 2026: nul tabellen
--               in schema intel gaan over zichtbaarheid in AI-antwoorden,
--               er is geen benchmarkset en geen vastgelegde methode.
--
--               Twee sporen die erop LIJKEN en het niet zijn: de
--               intel.ai_*-tabellen horen bij inhoudGENERATIE (welk
--               model mag een concept herschrijven, wat kost dat), en
--               src/cli/benchmark.ts is een PRESTATIEbenchmark.
--
--               Deze migratie maakt de laag die er niet was.
--
-- ------------------------------------------------------------
-- DE KERNEIS: EEN GECONTROLEERDE MODELMETING IS GEEN ZICHTBAARHEID
--
-- Dit is geen voorbehoud in de marge maar de reden dat de tabellen zo
-- heten als ze heten. Wat hier wordt vastgelegd is: dit model, op deze
-- datum, met deze prompt, in deze taal, zonder gespreksgeschiedenis,
-- noemde ons wel of niet. Dat is iets heel anders dan 'hoe vaak noemen
-- AI-assistenten ons tegen echte gebruikers':
--
--   * een echte gebruiker heeft een gespreksgeschiedenis, een locatie en
--     een eigen formulering;
--   * de meeste aanbieders personaliseren en A/B-testen;
--   * een modelversie verandert zonder aankondiging, en een antwoord is
--     niet deterministisch;
--   * wij meten één provider op het moment dat wij meten.
--
-- Daarom draagt ELKE meting de provider, het model, de modelversie, de
-- promptversie, de methodeversie en het meetmoment. Zonder die zes is
-- een getal niet te herhalen en dus geen meting.
--
-- ------------------------------------------------------------
-- EN EEN ONTBREKENDE METING IS GEEN SLECHTE ZICHTBAARHEID
--
-- Dezelfde fout die intel.analytics_dekking voor Search Console
-- voorkomt. Zou een mislukte poging gewoon AFWEZIG zijn, dan leest nul
-- vermeldingen als 'wij worden nooit genoemd' terwijl het 'wij hebben
-- niet gekeken' betekent.
--
-- Daarom heeft elke poging een RIJ, ook een mislukte, met een
-- `uitkomst` die drie waarden kent:
--
--   gemeten        er was een antwoord, en de detectie is erop gedraaid
--   niet_gemeten   er was geen bruikbaar antwoord (geen credential,
--                  quotum, storing, budget) — met de reden erbij
--   overgeslagen   bewust niet gemeten (prompt inactief, buiten venster)
--
-- Een rapport dat 'nul vermeldingen' meldt MOET daarom het aantal
-- gemeten pogingen ernaast zetten. De view onderaan dwingt dat af door
-- beide te leveren.
--
-- ------------------------------------------------------------
-- WAT DEZE MIGRATIE NIET DOET
--
-- Geen DML. Geen prompts gezaaid: de promptset is inhoud en hoort uit
-- src/db/zaai.ts te komen, zodat hij in code reviewbaar is en niet in
-- een migratie vastligt. En geen modelaanroep: op 1 november 2026 is er
-- geen enkele modelsleutel gezet op welke service dan ook, dus de
-- eerste ronde zal `niet_gemeten` opleveren met precies die reden. Dat
-- is de eerlijke uitkomst.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- De promptset, met versiebeheer.

create table if not exists intel.geo_prompts (
  id               bigserial primary key,
  organisatie_id   integer not null references intel.organisaties (id) on delete cascade,

  -- STABIELE SLEUTEL, zodat een nieuwe VERSIE van dezelfde vraag
  -- herkenbaar bij zijn voorganger hoort. Zonder dit is een
  -- historische vergelijking niet te maken: je weet dan niet of een
  -- verandering uit het model komt of uit een herschreven prompt.
  sleutel          text not null,
  versie           integer not null default 1 check (versie >= 1),

  onderwerp        text not null,
  prompt           text not null check (length(btrim(prompt)) >= 15),
  taal             text not null default 'nl',

  -- Een prompt wordt NIET verwijderd en niet herschreven: hij wordt
  -- inactief en krijgt een opvolger. Anders verliest elke historische
  -- reeks zijn ijkpunt.
  actief           boolean not null default true,
  reden_inactief   text,

  aangemaakt_op    timestamptz not null default now(),

  constraint geo_prompts_sleutel_versie unique (organisatie_id, sleutel, versie),
  constraint geo_prompts_inactief_heeft_reden
    check (actief or reden_inactief is not null)
);

comment on table intel.geo_prompts is
  'De vaste, representatieve zoekprompts voor de GEO-meting. Versiebeheer per sleutel: een '
  'herschreven vraag is een NIEUWE versie, nooit een wijziging van de bestaande, anders is een '
  'historische vergelijking niet te maken.';
comment on column intel.geo_prompts.sleutel is
  'Stabiel over versies heen. Hierop vergelijkt de trendview.';
comment on column intel.geo_prompts.reden_inactief is
  'Verplicht zodra actief=false. Een prompt die zonder reden uit de set verdwijnt maakt een '
  'trendbreuk die later niet te verklaren is.';

create index if not exists geo_prompts_actief_idx
  on intel.geo_prompts (organisatie_id, actief, onderwerp);

-- ---------------------------------------------------------------- 2
-- De metingen. Eén rij per poging, ook een mislukte.

create table if not exists intel.geo_metingen (
  id               bigserial primary key,
  organisatie_id   integer not null references intel.organisaties (id) on delete cascade,
  prompt_id        bigint not null references intel.geo_prompts (id) on delete cascade,

  -- DE ZES VELDEN DIE EEN METING HERHAALBAAR MAKEN. Zie de kop.
  prompt_sleutel   text not null,
  prompt_versie    integer not null,
  provider         text not null,
  model            text not null,
  model_versie     text,
  methode_versie   text not null,
  gemeten_op       timestamptz not null default now(),

  uitkomst         text not null
                     check (uitkomst in ('gemeten', 'niet_gemeten', 'overgeslagen')),
  reden            text,

  -- Het antwoord wordt BEWAARD, want zonder het antwoord is de detectie
  -- niet na te rekenen. Een hash alleen zou een cijfer opleveren dat
  -- niemand kan controleren.
  antwoord         text,
  antwoord_lengte  integer,

  -- De detectie-uitslag, afgeleid uit `antwoord`.
  merk_vermeld     boolean,
  eigen_citaten    integer,
  bron_verwijzingen integer,

  -- Kostenbewaking. In centen om afrondingsruis te vermijden.
  tokens_in        integer,
  tokens_uit       integer,
  kosten_cent      numeric(10, 4),

  -- EEN NIET-GEMETEN POGING MOET ZIJN REDEN DRAGEN. Zonder deze
  -- constraint kan een lege rij als 'niet zichtbaar' gaan lezen.
  constraint geo_metingen_niet_gemeten_heeft_reden
    check (uitkomst = 'gemeten' or reden is not null),
  -- EN EEN GEMETEN POGING MOET EEN ANTWOORD HEBBEN. Anders is de
  -- detectie op niets gedraaid.
  constraint geo_metingen_gemeten_heeft_antwoord
    check (uitkomst <> 'gemeten' or (antwoord is not null and merk_vermeld is not null))
);

comment on table intel.geo_metingen is
  'Eén rij per POGING, ook een mislukte. Een ontbrekende rij zou nul vermeldingen laten lezen '
  'als "wij worden nooit genoemd" terwijl het "wij hebben niet gekeken" betekent. Dit is een '
  'GECONTROLEERDE MODELMETING en geen zichtbaarheid bij echte AI-gebruikers; zie de kop van '
  'migratie 0049.';
comment on column intel.geo_metingen.methode_versie is
  'Verhoog dit zodra de detectie verandert. Twee reeksen met verschillende methodeversies zijn '
  'niet vergelijkbaar, en dat moet uit de data blijken en niet uit een aanname.';
comment on column intel.geo_metingen.antwoord is
  'Het volledige antwoord, zodat de detectie na te rekenen is. Een hash zou een cijfer opleveren '
  'dat niemand kan controleren.';

create index if not exists geo_metingen_prompt_idx
  on intel.geo_metingen (organisatie_id, prompt_sleutel, gemeten_op desc);
create index if not exists geo_metingen_uitkomst_idx
  on intel.geo_metingen (organisatie_id, uitkomst, gemeten_op desc);

-- ---------------------------------------------------------------- 3
-- Wat er precies is gedetecteerd. Per meting nul of meer rijen.

create table if not exists intel.geo_vermeldingen (
  id               bigserial primary key,
  organisatie_id   integer not null references intel.organisaties (id) on delete cascade,
  meting_id        bigint not null references intel.geo_metingen (id) on delete cascade,

  soort            text not null
                     check (soort in ('merk', 'eigen_pagina', 'andere_bron')),
  waarde           text not null,
  -- Waar in het antwoord, zodat 'genoemd in de eerste regel' te
  -- onderscheiden is van 'genoemd in een voetnoot'.
  positie          integer,
  citaat           text,

  constraint geo_vermeldingen_uniek unique (meting_id, soort, waarde)
);

comment on table intel.geo_vermeldingen is
  'De gedetecteerde vermeldingen per meting: ons merk, een geciteerde eigen pagina, of een '
  'andere bron die het model aanhaalt. Dat laatste is de concurrentiekant van dezelfde meting.';

create index if not exists geo_vermeldingen_meting_idx
  on intel.geo_vermeldingen (organisatie_id, meting_id);

-- ---------------------------------------------------------------- 4
-- De trendview, die het onderscheid AFDWINGT.

create or replace view intel.geo_zichtbaarheid_per_prompt as
  select m.organisatie_id,
         m.prompt_sleutel,
         m.provider,
         m.model,
         m.methode_versie,
         min(m.gemeten_op)                                             as vanaf,
         max(m.gemeten_op)                                             as tot,
         count(*)                                                      as pogingen,
         count(*) filter (where m.uitkomst = 'gemeten')                as gemeten,
         count(*) filter (where m.uitkomst = 'niet_gemeten')           as niet_gemeten,
         count(*) filter (where m.uitkomst = 'overgeslagen')            as overgeslagen,
         count(*) filter (where m.uitkomst = 'gemeten' and m.merk_vermeld) as met_merk,
         -- HET AANDEEL WORDT ALLEEN BEREKEND OVER GEMETEN POGINGEN, en
         -- is NULL zodra er niets is gemeten. Dat is de hele reden dat
         -- deze view bestaat: 0 van 0 is geen nul procent, het is geen
         -- getal. Een dashboard dat hier 0% toont zou liegen.
         case when count(*) filter (where m.uitkomst = 'gemeten') > 0
              then count(*) filter (where m.uitkomst = 'gemeten' and m.merk_vermeld)::numeric
                   / count(*) filter (where m.uitkomst = 'gemeten')
         end                                                           as aandeel_met_merk
    from intel.geo_metingen m
   group by m.organisatie_id, m.prompt_sleutel, m.provider, m.model, m.methode_versie;

comment on view intel.geo_zichtbaarheid_per_prompt is
  'aandeel_met_merk is NULL zodra er nul GEMETEN pogingen zijn. 0 van 0 is geen nul procent maar '
  'geen getal; een dashboard dat daar 0% toont presenteert een ontbrekende meting als slechte '
  'zichtbaarheid. Zet `pogingen` en `gemeten` er altijd naast.';

-- ---------------------------------------------------------------- 5
-- Rechten, in de stijl van 0024, 0039, 0046 en 0047.

grant select, insert, update on intel.geo_prompts to vibe_intel_app;
grant select on intel.geo_prompts to vibe_intel_lezer;
grant usage, select on sequence intel.geo_prompts_id_seq to vibe_intel_app;

grant select, insert, update on intel.geo_metingen to vibe_intel_app;
grant select on intel.geo_metingen to vibe_intel_lezer;
grant usage, select on sequence intel.geo_metingen_id_seq to vibe_intel_app;

grant select, insert on intel.geo_vermeldingen to vibe_intel_app;
grant select on intel.geo_vermeldingen to vibe_intel_lezer;
grant usage, select on sequence intel.geo_vermeldingen_id_seq to vibe_intel_app;

grant select on intel.geo_zichtbaarheid_per_prompt to vibe_intel_app, vibe_intel_lezer;

alter table intel.geo_prompts enable row level security;
alter table intel.geo_metingen enable row level security;
alter table intel.geo_vermeldingen enable row level security;

drop policy if exists geo_prompts_eigen_organisatie on intel.geo_prompts;
create policy geo_prompts_eigen_organisatie on intel.geo_prompts
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

drop policy if exists geo_metingen_eigen_organisatie on intel.geo_metingen;
create policy geo_metingen_eigen_organisatie on intel.geo_metingen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

drop policy if exists geo_vermeldingen_eigen_organisatie on intel.geo_vermeldingen;
create policy geo_vermeldingen_eigen_organisatie on intel.geo_vermeldingen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);
