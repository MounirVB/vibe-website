-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0034 de dagstand die een trend mogelijk maakt
-- ------------------------------------------------------------
-- WAAROM:       `intel.indexatie_status` KAN per constructie geen trend
--               bevatten. Hij heeft
--                 unique (organisatie_id, url, bron)
--               en de enige schrijver (src/analytics/koppelingen.ts) doet
--                 on conflict ... do update set laatst_gecontroleerd_op = now()
--               Elke nieuwe meting overschrijft dus de VORIGE tijdstempel
--               en daarmee het vorige meetpunt. Over 33 migraties en 56
--               intel-tabellen bestaat geen dagstand- of historietabel:
--               de cadans is ontworpen (Cloud Scheduler
--               `vibe-analytics-dagelijks`, cron `30 4 * * *`, zie
--               deploy/analytics-cloudrun-job.yaml — NIET UITGEROLD), de
--               BEWARING niet.
--
--               Dit is geen "pas met credentials"-probleem. De
--               credentialvrije helft — http_status, in_sitemap en de
--               canonical, met bron='eigen_meting' — is VANDAAG al
--               meetbaar en gaat door diezelfde overschrijving verloren.
--               Metriek 5 van het indexatierapport (indexatietrend van de
--               huidige pagina's) is daardoor niet half gemeten maar
--               structureel onmeetbaar.
--
-- WAT DIT DOET: één additieve tabel `intel.indexatie_dagstand`: per
--               ORGANISATIE, per DAG, per METRIEK, per BRON één rij.
--               De unieke sleutel bevat `datum`, dus de upsert van
--               vandaag raakt de rij van gisteren niet. Twee rijen op
--               twee datums zijn een trend; één rij die zichzelf
--               overschrijft is dat nooit.
--
--               Daarnaast vallen twee DODE kolommen weg. `grep` over de
--               hele repo (13 oktober 2026) geeft voor
--               pagina_register.live_http_status en
--               pagina_register.live_gemeten_op exact één treffer elk:
--               hun eigen definitieregel in 0004_inhoud.sql. Niemand
--               schrijft ze, niemand leest ze.
--
--               Ze VULLEN zou slechter zijn dan ze droppen:
--                 · de live-status is al zonder join bereikbaar —
--                   dashboard/server.ts leest http_status rechtstreeks
--                   uit intel.indexatie_status;
--                 · indexatie_status draagt per ontwerp al `bron` plus
--                   `bewijs`, dus daar is de herkomst van het getal
--                   bekend en hier niet;
--                 · pagina_register heeft een BEFORE UPDATE-trigger
--                   (pagina_register_bijgewerkt → zet_bijgewerkt_op).
--                   Elke live-meting zou `bijgewerkt_op` van elke gemeten
--                   pagina opstampen, waarmee "de pagina is gewijzigd" en
--                   "de pagina is gemeten" niet meer te onderscheiden
--                   zijn. Precies dat onderscheid draagt de
--                   goedkeuringsbinding van 0033.
--
-- WAAROM `aantal` NULLABLE IS, anders dan funnel_metingen.aantal
--               0006 regel 149 heeft `aantal integer not null check
--               (aantal >= 0)`. Dat is daar juist: een funnelrij BESTAAT
--               alleen omdat er een meting was. Een dagstand is het
--               tegenovergestelde: hij legt ook vast dat een metriek op
--               die dag NIET te meten was. Zou `aantal` not null zijn,
--               dan moest zo'n rij een 0 dragen — en 0 betekent
--               "gemeten, niets gevonden", niet "niet gemeten". Dat is
--               exact de verwarring die dit hele onderdeel moet
--               voorkomen. Daarom: aantal null + label NOT_AVAILABLE +
--               verplicht bewijs, en twee constraints die de twee
--               verboden combinaties afsluiten:
--                 · NOT_AVAILABLE met een getal (dan is het geen
--                   ontbrekende meting);
--                 · MEASURED zonder getal (dan is er niets gemeten).
--
-- TERUGDRAAIEN: drop table if exists intel.indexatie_dagstand;
--               alter table intel.pagina_register
--                 add column if not exists live_http_status integer,
--                 add column if not exists live_gemeten_op timestamptz;
--               (de twee kolommen waren leeg; terugzetten geeft ze leeg
--                terug, er is geen data om te herstellen)
-- ============================================================

create table if not exists intel.indexatie_dagstand (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,

  -- De dag waarover de stand gaat. Dit is de kolom die de trend
  -- mogelijk maakt: hij zit in de unieke sleutel, dus de run van vandaag
  -- kan de stand van gisteren niet aanraken.
  datum           date not null,

  -- De tien metrieken van het indexatierapport, letterlijk. TECHNICALLY_
  -- INDEXABLE en GOOGLE_INDEXED staan hier als TWEE waarden omdat ze
  -- twee verschillende dingen zijn: technisch indexeerbaar is wat wij
  -- kunnen meten, geindexeerd is wat Google heeft besloten. Zodra die
  -- twee in een kolom zouden samenvallen, is de ene stilletjes het
  -- substituut van de andere geworden.
  metriek         text not null check (metriek in (
                    'CURRENT_CANONICAL_INVENTORY',
                    'TECHNICALLY_INDEXABLE',
                    'GOOGLE_INDEXED',
                    'HISTORICAL_404',
                    'CURRENT_PAGE_INDEXATION',
                    'SITEMAP_PROCESSING',
                    'ORGANIC_IMPRESSIONS',
                    'ORGANIC_CLICKS',
                    'SEARCH_QUERIES',
                    'CONVERSION_PERFORMANCE')),

  -- Dezelfde bronlijst als intel.indexatie_status en
  -- intel.funnel_metingen, zodat een getal nooit van bron kan wisselen
  -- zonder dat het opvalt.
  bron            text not null check (bron in (
                    'eigen_meting', 'gsc', 'bing_webmaster', 'ga4', 'crm')),

  -- NULL = op deze dag NIET gemeten. Zie de kop: nul zou liegen.
  aantal          integer,
  -- De noemer waartegen `aantal` gelezen moet worden. "12" is geen
  -- informatie, "12 van 430" wel. NULL als er geen zinnige noemer is.
  noemer          integer,

  label           text not null check (label in (
                    'MEASURED', 'INFERRED', 'UNVERIFIED', 'NOT_AVAILABLE')),

  -- Verplicht. Een getal zonder herkomst is in dit platform geen meting,
  -- en bij een ontbrekende meting is juist de REDEN het hele bericht.
  bewijs          text not null check (bewijs <> ''),

  gemeten_op      timestamptz not null default now(),

  constraint indexatie_dagstand_uniek
    unique (organisatie_id, datum, metriek, bron),

  constraint indexatie_dagstand_aantal_niet_negatief
    check (aantal is null or aantal >= 0),
  constraint indexatie_dagstand_noemer_niet_negatief
    check (noemer is null or noemer >= 0),

  -- EEN ONTBREKENDE METING IS NOOIT NUL.
  constraint indexatie_dagstand_ontbrekend_heeft_geen_getal
    check (label <> 'NOT_AVAILABLE' or aantal is null),
  -- EN EEN METING IS NOOIT LEEG.
  constraint indexatie_dagstand_gemeten_heeft_een_getal
    check (label <> 'MEASURED' or aantal is not null)
);

comment on table intel.indexatie_dagstand is
  'Een rij per organisatie, dag, metriek en bron. Bestaat omdat intel.indexatie_status door '
  'unique (organisatie_id, url, bron) plus on conflict do update de vorige tijdstempel wist en '
  'dus per constructie geen trend kan dragen.';
comment on column intel.indexatie_dagstand.aantal is
  'NULL betekent: op deze dag niet gemeten. Nooit 0 gebruiken om dat uit te drukken; 0 betekent '
  'gemeten en niets gevonden.';
comment on column intel.indexatie_dagstand.noemer is
  'De noemer bij aantal. Een eigen live-meting van 12 paginas op een site van 430 hoort als '
  '"12 van 430" gelezen te worden, niet als "12".';
comment on column intel.indexatie_dagstand.label is
  'MEASURED = uit een eigen of geimporteerde meting met bewijs. INFERRED = afgeleid uit gemeten '
  'feiten zonder eigen bewaarde dagmeting. UNVERIFIED = er is data maar die bewijst de metriek '
  'niet (bron niet gevalideerd, of te weinig dagstanden voor een trend). NOT_AVAILABLE = geen '
  'bron; dan staat in bewijs WAT er ontbreekt.';

-- De leesweg van het rapport en van elke trendvraag: per metriek de
-- laatste dagen. Daarom metriek voor datum in de index.
create index if not exists indexatie_dagstand_idx
  on intel.indexatie_dagstand (organisatie_id, metriek, datum desc);

-- ------------------------------------------------------------
-- De twee dode kolommen. `if exists` zodat deze migratie ook op een
-- database draait waar ze (ooit, handmatig) al weg zijn.
-- ------------------------------------------------------------
alter table intel.pagina_register drop column if exists live_http_status;
alter table intel.pagina_register drop column if exists live_gemeten_op;

-- ------------------------------------------------------------
-- RLS en grants — exact de vorm van 0006_analytics.sql (regel 204-239).
-- Zonder elk van deze vier onderdelen (identity-sleutel, foreign key,
-- RLS met een *_eigen_organisatie-policy, grants) vuurt
-- intel_priv.controleer_invarianten() uit 0008 of de schematoets
-- "elke tenanttabel heeft RLS".
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['indexatie_dagstand']
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

-- UPDATE is nodig voor de upsert BINNEN de dag (een run om 04:30 en een
-- herstelrun om 11:00 horen één dagstand te zijn). DELETE met opzet
-- niet: een dagstand is historie, en historie die de applicatie kan
-- weggooien is geen historie.
grant select, insert, update on intel.indexatie_dagstand to vibe_intel_app;
grant select on intel.indexatie_dagstand to vibe_intel_lezer;
grant usage on sequence intel.indexatie_dagstand_id_seq to vibe_intel_app;
