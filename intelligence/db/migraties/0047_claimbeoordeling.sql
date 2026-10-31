-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0047 het claimbeoordelingsregister
-- ------------------------------------------------------------
-- WAAROM:       De juridische claimpoort uit 2f40c93 blokkeert een
--               claim die geen authentieke grondslag heeft, en legde dat
--               uitsluitend vast in een LOGREGEL:
--
--                 log.info("juridische claim niet zelfbevestigd", …)
--
--               Een logregel in Railway hoort bij de HUIDIGE deployment
--               en is na de volgende deploy weg. Er is dus niets om op
--               te handelen, en niets om na te meten.
--
--               De toelichtingen in uitspraken.ts en claimaard.ts
--               beloven op drie plekken dat zo'n claim "via
--               bronverificatie het origineel bij het bevoegde gezag
--               moet vinden". Gemeten op 31 oktober 2026: die route
--               bestaat wel, maar alleen voor NAVERTELLINGEN. De
--               werkvoorraad van verifieerNavertellingen() selecteert
--               `documentsoort = 'SECUNDAIRE_BERICHTGEVING' and
--               beschrijft_besluit_van is not null`, en
--               verifieerBijGezag() stapt op bronverificatie.ts:261
--               onmiddellijk uit met NIET_VAN_TOEPASSING zodra
--               beschrijft_besluit_van null is. Bij precies de claims
--               die de poort stopt is dat altijd zo. Zij vielen dus
--               buiten elke route.
--
-- WAT DIT DOET: een register van claims die om een MENSELIJKE
--               beoordeling vragen. Een geblokkeerde claim wordt
--               zichtbaar, telbaar en beslisbaar in plaats van stil.
--
-- WAT DIT NIET DOET — EN DIT IS DE BELANGRIJKSTE REGEL.
--               Dit register WAARDEERT NIETS OP. Er is geen code die
--               een rij hier leest en daarmee een uitspraak op
--               'bevestigd' zet. De bevestigingsweg blijft waar hij was
--               (schrijfUitspraken) en de bewijsplicht-trigger blijft
--               gelden. Een beslissing hier legt vast WAT een mens
--               vond; de claim zelf verandert alleen langs de bestaande
--               weg, en een HISTORISCHE claim verandert er nooit
--               automatisch door.
--
--               GEEN LUS. De unieke index claimbeoordeling_eenmalig
--               staat op (organisatie_id, uitspraak_id, motorversies).
--               Dezelfde claim onder dezelfde motorversies vraagt dus
--               precies EEN keer om beoordeling, hoe vaak de pijplijn
--               ook draait. Verandert een motorversie, dan is het een
--               NIEUWE vraag — bedoeld, want dan kan het oordeel
--               veranderen — maar binnen een versie is er nooit een
--               tweede ronde.
--
-- GEEN DML. Geen destructieve DDL. Een verse database heeft nul rijen.
--
-- TERUGDRAAIEN: drop table intel.claimbeoordeling; en de functie in
--               intel_priv droppen. Volledig additief.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- Het register.

create table if not exists intel.claimbeoordeling (
  id                bigserial primary key,
  organisatie_id    integer not null references intel.organisaties(id) on delete cascade,

  uitspraak_id      bigint  not null references intel.uitspraken(id) on delete cascade,
  versie_id         bigint  not null references intel.brondocument_versies(id) on delete cascade,

  -- WAAROM hij is doorverwezen. De uitslag van steltStukDeClaimVast():
  -- ACHTERGRONDPASSAGE, ANDER_GEZAG, ONTWERP,
  -- NIET_VASTSTELLENDE_MODALITEIT of GEEN_AUTHENTIEK_STUK. Een
  -- blokkade op 'achtergrond' vraagt een ander menselijk oordeel dan een
  -- blokkade op 'verkeerde vorm', dus dit onderscheid hoort bewaard.
  aanleiding        text    not null,
  reden             text    not null,

  -- De motorversies waaronder dit oordeel is geveld. Onderdeel van de
  -- idempotentiesleutel: hij maakt de vraag reproduceerbaar EN
  -- eenmalig.
  motorversies      text    not null,

  aangevraagd_op    timestamptz not null default now(),

  -- ---- de menselijke beslissing, leeg tot er een mens kijkt ----
  besloten_op       timestamptz,
  besluit           text,
  door              text,
  -- Net als bij de plannerpauze (0046): de ONVEILIGE kant vraagt een
  -- autorisatie. 'BEVESTIGBAAR' zegt dat een mens de claim juridisch
  -- gedekt acht, en dat hoort een naam te dragen.
  autorisatie       text,
  toelichting       text,

  constraint claimbeoordeling_aanleiding_geldig check (
    aanleiding in ('ACHTERGRONDPASSAGE', 'ANDER_GEZAG', 'ONTWERP',
                   'NIET_VASTSTELLENDE_MODALITEIT', 'GEEN_AUTHENTIEK_STUK')),
  constraint claimbeoordeling_reden_niet_leeg check (length(btrim(reden)) >= 10),
  constraint claimbeoordeling_besluit_geldig check (
    besluit is null or besluit in ('BEVESTIGBAAR', 'AFGEWEZEN', 'ONBESLIST')),
  -- Een beslissing is compleet of ze bestaat niet: tijd, uitkomst en
  -- naam horen bij elkaar.
  constraint claimbeoordeling_beslissing_compleet check (
    (besloten_op is null and besluit is null and door is null)
    or (besloten_op is not null and besluit is not null
        and length(btrim(coalesce(door, ''))) >= 2)),
  -- BEVESTIGBAAR vraagt een autorisatie. AFGEWEZEN en ONBESLIST niet:
  -- dat zijn de veilige kanten.
  constraint claimbeoordeling_bevestigbaar_vraagt_autorisatie check (
    besluit is distinct from 'BEVESTIGBAAR'
    or length(btrim(coalesce(autorisatie, ''))) >= 3)
);

-- DE GRENDEL TEGEN EEN LUS. Een unieke index en geen controle in code:
-- de worker mag vanaf twee plekken tegelijk draaien, en dan is een
-- `select … if not exists … insert` een race.
create unique index if not exists claimbeoordeling_eenmalig
  on intel.claimbeoordeling (organisatie_id, uitspraak_id, motorversies);

create index if not exists claimbeoordeling_open_idx
  on intel.claimbeoordeling (organisatie_id, aangevraagd_op desc)
  where besloten_op is null;

comment on table intel.claimbeoordeling is
  'Claims die door de juridische poort zijn gestopt en om een MENSELIJKE beoordeling vragen. '
  'Dit register waardeert NIETS op: geen code leest een rij hier om een uitspraak op bevestigd '
  'te zetten. Het maakt een blokkade zichtbaar en beslisbaar in plaats van stil. De unieke index '
  'claimbeoordeling_eenmalig voorkomt een herbeoordelingslus: dezelfde claim onder dezelfde '
  'motorversies vraagt precies een keer om beoordeling.';

comment on column intel.claimbeoordeling.besluit is
  'BEVESTIGBAAR betekent dat een mens de claim juridisch gedekt acht — en dat is een OORDEEL, '
  'geen statuswijziging. De uitspraak zelf blijft ongeverifieerd tot hij langs de gewone weg '
  '(een authentieke grondslag of een geslaagde bronverificatie) bevestigd raakt. Daarmee kan dit '
  'register per constructie geen historische claim opwaarderen.';

-- ---------------------------------------------------------------- 2
-- De identiteit staat vast; alleen de beslissing mag erbij.

create or replace function intel_priv.claimbeoordeling_identiteit_vast()
returns trigger language plpgsql as $$
begin
  if new.uitspraak_id   <> old.uitspraak_id
     or new.versie_id      <> old.versie_id
     or new.aanleiding     <> old.aanleiding
     or new.motorversies   <> old.motorversies
     or new.organisatie_id <> old.organisatie_id
     or new.aangevraagd_op <> old.aangevraagd_op then
    raise exception
      'de identiteit van een claimbeoordeling staat vast; alleen de beslissingsvelden mogen '
      'worden bijgewerkt. Een andere aanleiding is een nieuwe rij.';
  end if;
  return new;
end $$;

revoke all on function intel_priv.claimbeoordeling_identiteit_vast() from public;

drop trigger if exists claimbeoordeling_identiteit_vast on intel.claimbeoordeling;
create trigger claimbeoordeling_identiteit_vast
  before update on intel.claimbeoordeling
  for each row execute function intel_priv.claimbeoordeling_identiteit_vast();

-- ---------------------------------------------------------------- 3
-- Rechten, in de stijl van 0024, 0039 en 0046.

grant select, insert, update on intel.claimbeoordeling to vibe_intel_app;
grant select on intel.claimbeoordeling to vibe_intel_lezer;
grant usage, select on sequence intel.claimbeoordeling_id_seq to vibe_intel_app;

alter table intel.claimbeoordeling enable row level security;

drop policy if exists claimbeoordeling_eigen_organisatie on intel.claimbeoordeling;
create policy claimbeoordeling_eigen_organisatie on intel.claimbeoordeling
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);
