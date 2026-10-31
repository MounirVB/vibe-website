-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0046 de plannerpauze
-- ------------------------------------------------------------
-- WAAROM:       Er was geen manier om de keten stil te zetten. Gemeten
--               op 31 oktober 2026: 57 tabellen in het intel-schema en
--               geen enkele schakelaar; geen omgevingsvariabele in
--               src/cli/planner.ts; niets in intelligence/ops/. De enige
--               onderbreker die bestond is
--               intel.ai_stroomonderbreker.open_tot, en die raakt
--               uitsluitend AI-aanroepen.
--
--               Dat is een probleem omdat een push naar `main` in deze
--               repo de productiedeploy IS, en vibe-intel-api een
--               preDeployCommand draagt dat migreert. De cron
--               `0 * * * *` loopt daar dwars doorheen. Bij de
--               documentsoort-v2-release is dat niet theoretisch:
--               DOCUMENTSOORT_VERSIE is een CODECONSTANTE, en
--               src/pijplijn/claimpoort.ts faalt DICHT op een
--               versieverschil. Zonder pauze sluit de eerste
--               plannerronde na de deploy de claimpoort voor elke
--               bestaande v1-claim, en daarmee de besluitmotor, de
--               nieuwsselectie, de voorstellenlaag en de
--               conceptgeneratie.
--
-- WAT DIT DOET: een APPEND-ONLY logboek van pauze- en hervattingsbesluiten.
--               De HUIDIGE stand is de jongste rij per organisatie. Dat
--               is geen omslachtigheid maar de eis: een pauze moet
--               aantoonbaar zijn, en "wie heeft hem eraf gehaald en
--               waarom" is onderdeel van die aantoonbaarheid.
--
--               DE STAND LEEFT IN DE DATABASE EN NIET IN DE CODE OF IN
--               EEN OMGEVINGSVARIABELE. Dat is het hele punt: een deploy
--               vervangt de container en de omgeving, maar niet de
--               database. Een deployment kan de pauze dus niet ongemerkt
--               opheffen — daar is een tweede, benoemde handeling voor
--               nodig, met een autorisatie erbij.
--
-- WAT DIT NIET DOET: het raakt geen bestaande tabel aan, het verandert
--               geen enkele rij, en het zet de pauze NIET aan. Een verse
--               database is dus NIET gepauzeerd: zonder rijen is de
--               stand 'loopt'. Dat is bewust — een migratie die de keten
--               stilzet zou bij de volgende deploy de productie stoppen.
--
-- GEEN DML. Geen destructieve DDL.
--
-- TERUGDRAAIEN: drop table intel.plannerpauze; en de twee functies in
--               intel_priv droppen. Volledig additief, dus terugdraaien
--               kost niets behalve het logboek zelf.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- Het logboek.

create table if not exists intel.plannerpauze (
  id                bigserial primary key,
  organisatie_id    integer not null references intel.organisaties(id) on delete cascade,

  -- PAUZEER of HERVAT. Twee besluiten, geen toestandsvlag: een vlag
  -- vertelt niet wie hem omzette.
  actie             text    not null,

  -- WAAROM. Verplicht bij beide acties, en met een minimumlengte, zodat
  -- 'x' geen geldige reden is. Een pauze zonder reden is een pauze die
  -- niemand durft op te heffen.
  reden             text    not null,

  -- WIE. Een naam van een mens of de naam van het proces dat het deed.
  door              text    not null,

  -- DE AUTORISATIE BIJ HERVATTEN. Pauzeren mag altijd en van iedereen:
  -- stoppen is de veilige kant. HERVATTEN is de onveilige kant en vraagt
  -- daarom een expliciete autorisatie — zie de check hieronder. Wat erin
  -- staat is vrije tekst (een naam, een verwijzing naar een
  -- acceptatieronde, een ticket); dat het er STAAT is de eis.
  autorisatie       text,

  -- De verwachte motorversies op het moment van het besluit. Bij een
  -- v1/v2-release is dit het spoor waarmee je later kunt zien of de
  -- pauze vóór of ná de versiewissel is gezet.
  motorversies      text,

  gezet_op          timestamptz not null default now(),

  constraint plannerpauze_actie_geldig
    check (actie in ('PAUZEER', 'HERVAT')),
  constraint plannerpauze_reden_niet_leeg
    check (length(btrim(reden)) >= 10),
  constraint plannerpauze_door_niet_leeg
    check (length(btrim(door)) >= 2),
  -- HERVATTEN VEREIST EEN AUTORISATIE. Dit is een databaseconstraint en
  -- geen controle in code, want een controle in code kan worden
  -- overgeslagen door wie rechtstreeks in de database zit — en dat is
  -- precies het pad dat tijdens een release wordt gebruikt.
  constraint plannerpauze_hervatten_vraagt_autorisatie
    check (actie <> 'HERVAT' or length(btrim(coalesce(autorisatie, ''))) >= 3)
);

create index if not exists plannerpauze_stand_idx
  on intel.plannerpauze (organisatie_id, gezet_op desc, id desc);

comment on table intel.plannerpauze is
  'Append-only logboek van pauze- en hervattingsbesluiten voor de taakplanning. De HUIDIGE stand '
  'is de jongste rij per organisatie; geen rijen betekent "loopt". De stand staat in de DATABASE '
  'en niet in de code of de omgeving, zodat een deploy hem niet kan opheffen. PAUZEER mag van '
  'iedereen; HERVAT eist een autorisatie, afgedwongen door '
  'plannerpauze_hervatten_vraagt_autorisatie.';

comment on column intel.plannerpauze.autorisatie is
  'VERPLICHT bij HERVAT, verboden-leeg te laten. Pauzeren is de veilige kant en mag altijd; '
  'hervatten zet de keten weer in beweging en hoort een naam te dragen. Vrije tekst: een persoon, '
  'een acceptatieronde of een verwijzing. Dat het er staat is de eis, niet de vorm.';

-- ---------------------------------------------------------------- 2
-- De stand, als functie. Eén plek die bepaalt wat 'gepauzeerd' betekent,
-- zodat de planner, de worker en de CLI niet elk hun eigen query hebben.

create or replace function intel.planner_gepauzeerd(p_organisatie_id integer)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select p.actie = 'PAUZEER'
       from intel.plannerpauze p
      where p.organisatie_id = p_organisatie_id
      order by p.gezet_op desc, p.id desc
      limit 1),
    false)
$$;

comment on function intel.planner_gepauzeerd(integer) is
  'True als de JONGSTE rij voor deze organisatie een PAUZEER is. Geen rijen -> false (loopt). '
  'Sorteert op (gezet_op desc, id desc): twee besluiten in dezelfde microseconde worden door het '
  'id beslist, zodat de uitkomst niet van de klokresolutie afhangt.';

-- DE DEFAULT-ACL OP FUNCTIES IS PUBLIC EXECUTE. Dat is in dit schema
-- eerder een bevinding geweest; daarom hier expliciet dicht en dan
-- gericht open.
revoke all on function intel.planner_gepauzeerd(integer) from public;
grant execute on function intel.planner_gepauzeerd(integer) to vibe_intel_app;
grant execute on function intel.planner_gepauzeerd(integer) to vibe_intel_lezer;

-- ---------------------------------------------------------------- 3
-- Append-only, zoals 0001, 0036 en 0039.

create or replace function intel_priv.plannerpauze_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception
    'intel.plannerpauze is append-only (poging tot %). Een pauze opheffen doe je met een '
    'HERVAT-rij, niet door de PAUZEER-rij te wissen of te herschrijven — anders verdwijnt '
    'juist het spoor dat bewijst dat er gepauzeerd was.', tg_op;
end $$;

revoke all on function intel_priv.plannerpauze_is_append_only() from public;

drop trigger if exists plannerpauze_geen_verwijdering on intel.plannerpauze;
create trigger plannerpauze_geen_verwijdering
  before delete on intel.plannerpauze
  for each statement execute function intel_priv.plannerpauze_is_append_only();

drop trigger if exists plannerpauze_geen_wijziging on intel.plannerpauze;
create trigger plannerpauze_geen_wijziging
  before update on intel.plannerpauze
  for each statement execute function intel_priv.plannerpauze_is_append_only();

-- ---------------------------------------------------------------- 4
-- Rechten, in de stijl van 0024 en 0039: schrijven en lezen mag,
-- verwijderen niet.

grant select, insert on intel.plannerpauze to vibe_intel_app;
grant select on intel.plannerpauze to vibe_intel_lezer;
grant usage, select on sequence intel.plannerpauze_id_seq to vibe_intel_app;

alter table intel.plannerpauze enable row level security;

drop policy if exists plannerpauze_eigen_organisatie on intel.plannerpauze;
create policy plannerpauze_eigen_organisatie on intel.plannerpauze
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);
