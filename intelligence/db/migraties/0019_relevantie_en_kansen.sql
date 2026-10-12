-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0019 bedrijfsrelevantie en kansen
-- ------------------------------------------------------------
-- WAAROM:       Release 3.0 moet besluiten opleveren in plaats van
--               rijen. Twee gemeten tekorten staan daarvoor in de weg.
--
-- TEKORT 1 — MATERIALITEIT MEET GEEN RELEVANTIE.
--               berekenMaterialiteit() heeft zes assen met plafonds
--               25/15/20/15/15/10. Vijf daarvan beschrijven de BRON en
--               het BEWIJS; precies één de inhoud, met plafond 10. Die
--               ene as is trefwoorddichtheid, geen bedrijfsrelevantie.
--               Gemeten gevolg in productie op 12 oktober 2026:
--
--                 61  Wetsvoorstel hardere aanpak SCHADUWVLOOT
--                 56  Realisatie zonnepanelen Limburgs Museum
--
--               Maritieme handhaving stond dus HOGER dan een echte
--               aanbesteding. Zeven van de acht probleemgevallen kregen
--               bovendien exact dezelfde onderwerpscore 6 — de as kan
--               ze niet onderscheiden.
--
--               Daarom een TWEEDE, ORTHOGONALE as naast materialiteit,
--               en niet een verbouwing van die eerste. Materialiteit
--               blijft meten hoe zwaar iets is; relevantie meet of het
--               ons aangaat. Ze in één getal persen verstopt precies de
--               onzekerheid die een reviewer nodig heeft.
--
-- TEKORT 2 — EEN SIGNAAL IS GEEN KANS.
--               intel.commerciele_signalen draagt per PUBLICATIE een
--               rij. Twee aankondigingen van dezelfde opdrachtgever met
--               dezelfde titel staan er dus twee keer in, en de vier
--               echte signalen leveren vier losse rijen met identieke,
--               generieke hypotheses op.
--
--               Gemeten: alle vier hebben tekst_lengte 0. TenderNed
--               levert in de aankondigingenlijst alleen een titel en
--               een URL. Daarom draagt intel.kansen expliciet ONBEKEND
--               als eerste-klas waarde. Een kans zonder sluitingsdatum
--               is geen kans met sluitingsdatum nul.
--
-- WAT DIT DOET: additief. Geen kolom wordt verwijderd, geen bestaande
--               waarde herschreven. De oude tabellen blijven werken,
--               zodat een terugrol van de code geen datamigratie vraagt.
--
-- TERUGDRAAIEN: drop table intel.kans_publicaties, intel.kansen;
--               alter table intel.markt_gebeurtenissen
--                 drop column relevantie_categorie,
--                 drop column bedrijfsrelevantie,
--                 drop column relevantie_vertrouwen,
--                 drop column relevantie_grondslag;
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Bedrijfsrelevantie op de gebeurtenis
-- ------------------------------------------------------------
alter table intel.markt_gebeurtenissen
  add column if not exists relevantie_categorie text,
  add column if not exists bedrijfsrelevantie smallint,
  add column if not exists relevantie_vertrouwen smallint,
  add column if not exists relevantie_grondslag jsonb not null default '{}'::jsonb,
  add column if not exists relevantie_op timestamptz;

alter table intel.markt_gebeurtenissen
  drop constraint if exists gebeurtenissen_relevantie_categorie;
alter table intel.markt_gebeurtenissen
  add constraint gebeurtenissen_relevantie_categorie check (
    relevantie_categorie is null or relevantie_categorie in (
      'commerciele_kans', 'redactionele_kans', 'regelgeving',
      'marktintelligentie', 'achtergrond', 'niet_relevant'));

alter table intel.markt_gebeurtenissen
  drop constraint if exists gebeurtenissen_relevantie_bereik;
alter table intel.markt_gebeurtenissen
  add constraint gebeurtenissen_relevantie_bereik check (
    (bedrijfsrelevantie is null or bedrijfsrelevantie between 0 and 100) and
    (relevantie_vertrouwen is null or relevantie_vertrouwen between 0 and 100));

-- Een geclassificeerde gebeurtenis draagt ALTIJD zijn grondslag. Een
-- score zonder uitleg is in dit systeem geen score; §6 eist dat een
-- hoge uitslag verdedigbaar is.
alter table intel.markt_gebeurtenissen
  drop constraint if exists gebeurtenissen_relevantie_heeft_grondslag;
alter table intel.markt_gebeurtenissen
  add constraint gebeurtenissen_relevantie_heeft_grondslag check (
    relevantie_categorie is null or relevantie_grondslag <> '{}'::jsonb);

create index if not exists gebeurtenissen_relevantie_idx
  on intel.markt_gebeurtenissen (organisatie_id, relevantie_categorie, bedrijfsrelevantie desc)
  where relevantie_categorie is not null;

comment on column intel.markt_gebeurtenissen.bedrijfsrelevantie is
  'Hoe dicht staat dit bij wat Vibe Energy doet (0-100). LOS van materialiteit, '
  'die meet hoe zwaar de publicatie is. Zie src/pijplijn/relevantie.ts.';
comment on column intel.markt_gebeurtenissen.relevantie_vertrouwen is
  'Hoe zeker is die inschatting. Een aanbesteding zonder brontekst is relevant '
  'met een LAAG vertrouwen; dat is iets anders dan niet relevant.';

-- ------------------------------------------------------------
-- 2. Kansen: een kans is geen publicatie
-- ------------------------------------------------------------
create table if not exists intel.kansen (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,

  -- Wie en wat. Dit is het enige dat uit een titel te halen valt.
  opdrachtgever     text not null,
  project           text not null,

  -- ALLES HIERONDER MAG ONBEKEND ZIJN, en dat is het punt.
  -- Gemeten: TenderNed levert in de lijst geen inhoud, dus voor de vier
  -- echte signalen is elk van deze velden leeg. Een leeg veld is een
  -- onderzoeksvraag, geen nul.
  locatie           text,
  referentie        text,
  procedure_soort   text,
  procedure_status  text,
  sluit_op          date,
  omvang_tekst      text,
  opdracht_omvang   text,
  eisen             text[] not null default '{}',

  relevante_oplossingen text[] not null default '{}',

  -- Vier APARTE assen (§6). Eén getal zou elke onzekerheid verstoppen.
  score_relevantie  smallint not null default 0 check (score_relevantie between 0 and 100),
  score_vertrouwen  smallint not null default 0 check (score_vertrouwen between 0 and 100),
  score_urgentie    smallint not null default 0 check (score_urgentie between 0 and 100),
  score_handelbaar  smallint not null default 0 check (score_handelbaar between 0 and 100),
  score_grondslag   jsonb not null default '{}'::jsonb,

  -- Wat we NIET weten, expliciet en machineleesbaar.
  ontbrekend        text[] not null default '{}',
  aanbevolen_actie  text,

  -- Levenscyclus uit §7.
  status            text not null default 'NIEUW' check (status in (
                      'NIEUW', 'ONDERZOEK_NODIG', 'GEKWALIFICEERD', 'REVIEW',
                      'GOEDGEKEURD_VOOR_OPVOLGING', 'IN_BEHANDELING',
                      'GEWONNEN', 'VERLOREN', 'GEARCHIVEERD', 'AFGEWEZEN')),
  afwijs_reden      text,
  toegewezen_aan    bigint references intel.gebruikers(id) on delete set null,
  herinnering_op    date,
  beoordeeld_op     timestamptz,
  beoordeeld_door   bigint references intel.gebruikers(id) on delete set null,

  -- Dezelfde harde grenzen als op commerciele_signalen.
  interesse_bewezen boolean not null default false,
  bevat_persoonsgegevens boolean not null default false,

  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  -- Een afwijzing zonder reden is geen afwijzing (§7).
  constraint kansen_afwijzing_heeft_reden check (
    status <> 'AFGEWEZEN' or (afwijs_reden is not null and length(afwijs_reden) >= 10)),
  -- Persoonsgegevens horen hier niet, net als in commerciele_signalen.
  constraint kansen_geen_persoonsgegevens check (bevat_persoonsgegevens = false),
  -- Interesse is nooit door de pijplijn te zetten; dat vraagt bewijs van
  -- een eigen aanvraag. Een openbare aankondiging is dat niet.
  constraint kansen_interesse_vraagt_kwalificatie check (
    interesse_bewezen = false or status in (
      'GOEDGEKEURD_VOOR_OPVOLGING', 'IN_BEHANDELING', 'GEWONNEN', 'VERLOREN'))
);

-- ------------------------------------------------------------
-- 3. De koppeling kans <-> publicatie: een kans kan MEERDERE
--    publicaties hebben, en elke publicatie houdt zijn eigen herkomst
-- ------------------------------------------------------------
-- Dit is de kern van de Rotterdam-vraag uit §30. Twee aankondigingen
-- van Veiligheidsregio Rotterdam-Rijnmond met dezelfde titel
-- (TenderNed 443632 van 2026-10-08 en 434533 van 2026-07-24) kunnen
-- twee fases van één inkoop zijn, of twee losse inkopen. Samenvoegen
-- verbergt er één; los laten telt dubbel. Daarom: één kans met twee
-- publicaties, en een expliciet veld dat zegt dat de RELATIE onbekend is.
create table if not exists intel.kans_publicaties (
  kans_id           bigint not null references intel.kansen(id) on delete cascade,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  gebeurtenis_id    bigint references intel.markt_gebeurtenissen(id) on delete set null,
  brondocument_id   bigint references intel.brondocumenten(id) on delete set null,

  url               text not null,
  titel             text not null,
  gepubliceerd_op   date,
  uitgever          text,

  -- Hoe verhoudt deze publicatie zich tot de andere binnen de kans?
  relatie           text not null default 'onbekend' check (relatie in (
                      'eerste', 'zelfde_inkoop', 'nieuwe_fase', 'herhaling', 'onbekend')),
  relatie_grondslag text,

  toegevoegd_op     timestamptz not null default now(),
  primary key (kans_id, url)
);

create index if not exists kansen_organisatie_status_idx
  on intel.kansen (organisatie_id, status, score_relevantie desc);
create index if not exists kansen_sluit_idx
  on intel.kansen (organisatie_id, sluit_op)
  where sluit_op is not null and status not in ('GEWONNEN','VERLOREN','GEARCHIVEERD','AFGEWEZEN');
create index if not exists kans_publicaties_gebeurtenis_idx
  on intel.kans_publicaties (gebeurtenis_id);

alter table intel.kansen enable row level security;
alter table intel.kans_publicaties enable row level security;

drop policy if exists kansen_eigen_organisatie on intel.kansen;
create policy kansen_eigen_organisatie on intel.kansen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

drop policy if exists kans_publicaties_eigen_organisatie on intel.kans_publicaties;
create policy kans_publicaties_eigen_organisatie on intel.kans_publicaties
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

grant select, insert, update on intel.kansen to vibe_intel_app;
grant usage on sequence intel.kansen_id_seq to vibe_intel_app;
grant select, insert, update, delete on intel.kans_publicaties to vibe_intel_app;
grant select on intel.kansen to vibe_intel_lezer;
grant select on intel.kans_publicaties to vibe_intel_lezer;

drop trigger if exists kansen_bijgewerkt on intel.kansen;
create trigger kansen_bijgewerkt before update on intel.kansen
  for each row execute function intel_priv.zet_bijgewerkt_op();

comment on table intel.kansen is
  'Een KANS, niet een publicatie. Meerdere aankondigingen over dezelfde inkoop '
  'horen bij een kans; zie intel.kans_publicaties. Elk feitveld mag leeg zijn: '
  'een onbekende sluitingsdatum is een onderzoeksvraag, geen nul.';
comment on column intel.kansen.ontbrekend is
  'Wat er aantoonbaar NIET bekend is, machineleesbaar. Vult de dossierweergave '
  'en bepaalt of de status ONDERZOEK_NODIG blijft.';
comment on column intel.kans_publicaties.relatie is
  'Hoe deze publicatie zich tot de andere binnen de kans verhoudt. '
  '''onbekend'' is een geldige en vaak eerlijke uitkomst: bij TenderNed levert '
  'de aankondigingenlijst geen inhoud om fases aan te herkennen.';

commit;
