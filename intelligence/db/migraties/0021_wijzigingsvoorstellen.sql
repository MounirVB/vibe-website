-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0021 wijzigingsvoorstellen
-- ------------------------------------------------------------
-- WAAROM:       Part C vraagt voorstellen die KLAARSTAAN voor menselijke
--               goedkeuring. Tot nu toe bestond er een concept (een
--               artikeltekst) en een kandidaat (een besluit), maar niets
--               dat zei: dit is een voorstel om DEZE pagina te wijzigen,
--               het is op vier punten gecontroleerd, en het wacht op een
--               mens.
--
-- WAT ER UIT DE CONTROLE KWAM (gemeten 12 oktober 2026, 19 kandidaten)
--
--                 1  klaar voor beoordeling
--                10  hoort op een andere pagina
--                 8  afwijzen
--
--               Die verhouding is het punt. Een platform dat 19
--               voorstellen aanlevert, levert werk op; een platform dat
--               er 1 aanlevert met 18 onderbouwde afwijzingen, levert
--               een besluit op.
--
-- DE VIER CONTROLES worden per voorstel bewaard, niet alleen hun
--               uitkomst. Een afwijzing zonder reden is in dit systeem
--               geen afwijzing (zie 0019, kansen_afwijzing_heeft_reden),
--               en datzelfde geldt hier.
--
-- EEN ECHTE FOUT DIE DEZE LAAG VING
--               De controle 'bronverwijzing' wees een voorstel af dat er
--               klaar uitzag. De brontekst zei 'EUR 200 miljard', de
--               bewaarde uitspraak zei 200 EUR: het schaalwoord was in de
--               extractie verdwenen, met verificatie_status 'bevestigd'
--               en bewijs_kwaliteit 5. Zonder deze poort had er '200
--               euro' op een publieke pagina gestaan.
--               Lokaal gemeten: 6 van de 32 numerieke uitspraken.
--
-- WAT DIT NIET DOET
--               Publiceren. Er is geen status die 'gepubliceerd' heet;
--               goedkeuren levert een patch op die een mens doorvoert.
--               Het platform mag alleen data/inhoud/nieuws/<slug>.json
--               auteuren (TOEGESTAAN_AUTEURSPAD in publicatie/pr.ts).
--
-- TERUGDRAAIEN: drop table intel.inhoud_voorstel_controles,
--                          intel.inhoud_voorstellen;
-- ============================================================

begin;

create table if not exists intel.inhoud_voorstellen (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  kandidaat_id      bigint not null references intel.inhoud_kandidaten(id) on delete cascade,
  gebeurtenis_id    bigint not null references intel.markt_gebeurtenissen(id) on delete cascade,

  -- De bestaande pagina, zoals gemeten op het moment van voorstellen.
  doel_pad          text,
  doel_h1           text,
  -- Het voorbehoud dat de pagina ZELF publiceert over zijn scope. Dit is
  -- het veld waarmee 10 van de 19 voorstellen zijn omgeleid.
  doel_voorbehoud   text,
  doel_noemt_onderwerp integer not null default 0,

  -- De voorgestelde wijziging.
  wijziging_soort   text not null default 'geen' check (wijziging_soort in (
                      'alinea_toevoegen', 'sectie_toevoegen', 'geen')),
  doel_sectie       text,
  nieuwe_tekst      text,
  diff              text[] not null default '{}',

  -- De commerciële CTA, met de reden waarom hij mag.
  cta_tekst         text,
  cta_doel          text,
  cta_grondslag     text,

  eindoordeel       text not null check (eindoordeel in (
                      'KLAAR_VOOR_REVIEW', 'HERROUTEREN', 'UITSTELLEN', 'AFWIJZEN')),
  oordeel_reden     text not null,

  -- De menselijke beoordeling. Door het platform NOOIT gezet.
  beoordeeld_op     timestamptz,
  beoordeeld_door   bigint references intel.gebruikers(id) on delete set null,
  beoordeling       text check (beoordeling is null or beoordeling in (
                      'GOEDGEKEURD', 'AFGEKEURD', 'AANGEPAST')),
  beoordeling_notitie text,

  aangemaakt_op     timestamptz not null default now(),
  bijgewerkt_op     timestamptz not null default now(),

  -- Een oordeel zonder reden is geen oordeel.
  constraint voorstel_oordeel_heeft_reden check (length(oordeel_reden) >= 20),
  -- Een menselijke beoordeling draagt altijd wie en wanneer.
  constraint voorstel_beoordeling_compleet check (
    beoordeling is null or (beoordeeld_op is not null and beoordeeld_door is not null)),
  -- ALLEEN een voorstel dat de controles haalde mag worden goedgekeurd.
  -- Een afgewezen of om te leiden voorstel goedkeuren zou de hele
  -- controlelaag zinloos maken.
  constraint voorstel_alleen_review_goedkeuren check (
    beoordeling <> 'GOEDGEKEURD' or eindoordeel = 'KLAAR_VOOR_REVIEW'),
  -- Eén levend voorstel per kandidaat.
  constraint voorstel_een_per_kandidaat unique (organisatie_id, kandidaat_id)
);

-- De vier controles apart, zodat de grondslag navraagbaar blijft.
create table if not exists intel.inhoud_voorstel_controles (
  voorstel_id       bigint not null references intel.inhoud_voorstellen(id) on delete cascade,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  naam              text not null check (naam in (
                      'bronverwijzing', 'actualiteit', 'duplicatie', 'seo')),
  oordeel           text not null check (oordeel in ('PASS', 'VOORBEHOUD', 'FAIL')),
  reden             text not null,
  bewijs            text[] not null default '{}',
  primary key (voorstel_id, naam)
);

create index if not exists voorstellen_oordeel_idx
  on intel.inhoud_voorstellen (organisatie_id, eindoordeel, aangemaakt_op desc);
create index if not exists voorstellen_wacht_op_mens_idx
  on intel.inhoud_voorstellen (organisatie_id, aangemaakt_op desc)
  where eindoordeel = 'KLAAR_VOOR_REVIEW' and beoordeling is null;

alter table intel.inhoud_voorstellen enable row level security;
alter table intel.inhoud_voorstel_controles enable row level security;

drop policy if exists voorstellen_eigen_organisatie on intel.inhoud_voorstellen;
create policy voorstellen_eigen_organisatie on intel.inhoud_voorstellen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

drop policy if exists voorstel_controles_eigen_organisatie on intel.inhoud_voorstel_controles;
create policy voorstel_controles_eigen_organisatie on intel.inhoud_voorstel_controles
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

-- De pijplijn mag voorstellen schrijven en bijwerken. Verwijderen niet:
-- een voorstel dat is beoordeeld hoort te blijven staan.
grant select, insert, update on intel.inhoud_voorstellen to vibe_intel_app;
grant usage on sequence intel.inhoud_voorstellen_id_seq to vibe_intel_app;
grant select, insert, update, delete on intel.inhoud_voorstel_controles to vibe_intel_app;
grant select on intel.inhoud_voorstellen to vibe_intel_lezer;
grant select on intel.inhoud_voorstel_controles to vibe_intel_lezer;

drop trigger if exists voorstellen_bijgewerkt on intel.inhoud_voorstellen;
create trigger voorstellen_bijgewerkt before update on intel.inhoud_voorstellen
  for each row execute function intel_priv.zet_bijgewerkt_op();

comment on table intel.inhoud_voorstellen is
  'Een voorstel om een BESTAANDE pagina te wijzigen, met de vier controles erbij. '
  'Wacht altijd op een mens: er is geen status ''gepubliceerd''.';
comment on column intel.inhoud_voorstellen.doel_voorbehoud is
  'Het voorbehoud dat de doelpagina zelf publiceert over zijn scope. Hiermee zijn '
  '10 van de 19 voorstellen omgeleid: een pagina die zegt dat tarieven elders staan, '
  'hoort geen tariefbedragen te krijgen.';
comment on constraint voorstel_alleen_review_goedkeuren on intel.inhoud_voorstellen is
  'Zonder deze grendel kon een afgewezen voorstel alsnog worden goedgekeurd, en dan '
  'is de controlelaag decoratie.';

commit;
