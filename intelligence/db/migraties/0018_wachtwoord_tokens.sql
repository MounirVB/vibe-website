-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0018 instelsleutels voor wachtwoorden
-- ------------------------------------------------------------
-- WAAROM:       De twee gezaaide accounts kregen hun wachtwoord van een
--               ONTWIKKELAAR, in een terminal. Dat is om twee redenen
--               fout, los van hoe sterk het wachtwoord was:
--
--               1 iemand anders dan de eigenaar van het account kende
--                 het geheim;
--               2 het moest ergens naartoe, en elke weg daarheen
--                 (chat, mail, een variabele) is een kopie op een plek
--                 die niemand later opruimt.
--
--               Er bestond ook geen enkele herstelweg: `npm run
--               wachtwoord` was de ÉNIGE schrijfweg naar
--               wachtwoord_hash, en die vraagt databasetoegang. Een
--               gebruiker kon zijn eigen wachtwoord niet zetten.
--
-- WAT DIT DOET: eenmalige instelsleutels. Een operator maakt er één aan
--               voor een account; de HOUDER van die sleutel kiest
--               daarna zelf een wachtwoord. De operator ziet dat
--               wachtwoord nooit.
--
-- DRIE EIGENSCHAPPEN, ELK MET EEN REDEN
--
--   · ALLEEN DE HASH van de sleutel staat hier. Wie deze tabel leest —
--     een back-up, een lek, een nieuwsgierige lezer — kan er geen
--     sleutel uit halen. Dezelfde reden dat wachtwoord_hash een hash is.
--
--   · EENMALIG. `gebruikt_op` wordt bij inwisselen gezet, en de
--     partiële unieke index laat per gebruiker maar één ONGEBRUIKTE
--     sleutel bestaan. Een tweede aanvraag vervangt de eerste in
--     plaats van er twee geldig te laten zijn.
--
--   · VERLOOPT. Een sleutel die eeuwig geldig is, is een wachtwoord met
--     extra stappen.
--
-- WAT DE APPLICATIEROL MAG:
--               lezen, en `gebruikt_op` zetten. Niet aanmaken — een
--               sleutel uitgeven is een operatorhandeling, net als het
--               verhogen van sessie_epoch in 0015.
--
-- TERUGDRAAIEN: drop table intel.wachtwoord_tokens;
-- ============================================================

begin;

create table if not exists intel.wachtwoord_tokens (
  id              bigserial primary key,
  organisatie_id  integer not null references intel.organisaties(id) on delete cascade,
  gebruiker_id    integer not null references intel.gebruikers(id) on delete cascade,

  -- sha256 van de sleutel, hex. NOOIT de sleutel zelf.
  token_hash      text    not null,

  aangemaakt_op   timestamptz not null default now(),
  verloopt_op     timestamptz not null,
  gebruikt_op     timestamptz,
  -- Wie hem uitgaf. 'operator' bij de CLI; vrij tekstveld zodat een
  -- latere selfservice-stroom er iets anders in kan zetten.
  uitgegeven_door text    not null,

  constraint tokens_hash_vorm check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint tokens_verloopt_na_aanmaak check (verloopt_op > aangemaakt_op),
  constraint tokens_gebruik_na_aanmaak check (gebruikt_op is null or gebruikt_op >= aangemaakt_op)
);

-- EENMALIGHEID: per gebruiker één ongebruikte sleutel.
create unique index if not exists tokens_een_open_per_gebruiker
  on intel.wachtwoord_tokens (gebruiker_id)
  where gebruikt_op is null;

-- Opzoeken gebeurt op de hash; dat is het enige wat de route heeft.
create index if not exists tokens_op_hash
  on intel.wachtwoord_tokens (token_hash)
  where gebruikt_op is null;

alter table intel.wachtwoord_tokens enable row level security;

drop policy if exists tokens_eigen_organisatie on intel.wachtwoord_tokens;
create policy tokens_eigen_organisatie on intel.wachtwoord_tokens
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

-- Lezen en afstempelen mag de applicatie; uitgeven niet.
grant select on intel.wachtwoord_tokens to vibe_intel_app;
grant update (gebruikt_op) on intel.wachtwoord_tokens to vibe_intel_app;
grant select on intel.wachtwoord_tokens to vibe_intel_lezer;

-- Het inwisselen zet wachtwoord_hash. Dat recht heeft de applicatierol
-- sinds 0015 NIET, en dat blijft zo: de inwisselroute draait daarvoor
-- een eigen transactie als eigenaar. Zie src/dashboard/instellen.ts.

comment on table intel.wachtwoord_tokens is
  'Eenmalige, verlopende instelsleutels waarmee de houder van een account '
  'zelf een wachtwoord kiest. Alleen de sha256 van de sleutel staat hier. '
  'De partiele unieke index tokens_een_open_per_gebruiker maakt hem eenmalig.';

commit;
