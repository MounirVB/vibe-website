-- ============================================================
-- 0059 — een autorisatiebewijs werkt precies één keer
-- ------------------------------------------------------------
-- WAT ER ONTBRAK, EN WAAROM EEN TABEL DE ENIGE PLEK IS.
--
-- De machinepoort van V1 hing aan één statisch geheim. Dat
-- authenticeert "iemand die het geheim kent" en zegt niets over WELKE
-- repository, WELKE werkstroom of WELKE run aanklopt — en het blijft
-- geldig tot iemand hem rouleert. V1.1 vervangt dat door een
-- GitHub-OIDC-token: GitHub ondertekent zelf een JWT met de repository,
-- het werkstroompad, de run-id, de poging, de commit, de ref en het
-- event erin.
--
-- Die ondertekening maakt het token ONVERZINBAAR, maar niet
-- ONHERHAALBAAR. Wie een geldig token onderschept — uit een log, een
-- proxy, een gecompromitteerde stap — kan het binnen zijn geldigheid
-- opnieuw aanbieden. De cryptografie kan dat niet zien: het token is
-- immers echt. Alleen een GEHEUGEN van wat al is gebruikt kan het
-- tegenhouden, en geheugen dat een herstart en twee processen overleeft
-- staat in de database. Een Map in het proces zou met twee instanties
-- van vibe-intel-api al niet meer werken.
--
-- DE SLEUTEL IS `jti`. GitHub zet in elk OIDC-token een unieke
-- identificatie. Die is hier de primaire sleutel, dus een tweede poging
-- met hetzelfde token botst op de primaire sleutel — een weigering door
-- de database en niet door een controle die iemand kan vergeten.
--
-- ------------------------------------------------------------
-- WAAROM DE RIJEN WEER WEG MOGEN
--
-- Een token dat is verlopen kan niet meer worden hergebruikt, ook niet
-- als deze tabel hem vergeet: dashboard/oidc.ts weigert hem dan op `exp`
-- en op de eigen leeftijdsgrens van tien minuten. De rij hoeft dus
-- alleen te bestaan zolang het token zelf geldig kan zijn. `verloopt_op`
-- draagt dat moment, en de poort ruimt bij elke verificatie op wat
-- voorbij is. Zonder die opruiming groeit de tabel met elke aanroep en
-- is hij na een jaar een logboek van niets.
--
-- WAT ER NIET IN STAAT: het token zelf. Alleen zijn identificatie en de
-- herkomst eromheen. Een tabel met JWT's erin zou een tabel met
-- credentials zijn, en die komt in elke back-up terecht — ook in de
-- externe kopie in GCS.
-- ============================================================

create table if not exists intel.machine_tokens (
  jti              text        primary key,
  organisatie_id   bigint      not null references intel.organisaties(id) on delete restrict,
  repository       text        not null,
  workflow_ref     text        not null,
  run_id           text        not null,
  run_attempt      text,
  -- Waarvoor het token is gebruikt; maakt een logboekregel leesbaar
  -- zonder de audittabellen te hoeven koppelen.
  handeling        text        not null,
  gebruikt_op      timestamptz not null default now(),
  verloopt_op      timestamptz not null
);

comment on table intel.machine_tokens is
  'Elk gebruikt GitHub-OIDC-token precies één keer. De primaire sleutel is de jti, dus een herhaling botst op de database. Zie 0059 en dashboard/oidc.ts.';
comment on column intel.machine_tokens.verloopt_op is
  'Tot wanneer dit token geldig had kunnen zijn. Daarna mag de rij weg: oidc.ts weigert een verlopen token zelf al.';

create index if not exists machine_tokens_verloopt_idx
  on intel.machine_tokens (verloopt_op);
create index if not exists machine_tokens_run_idx
  on intel.machine_tokens (organisatie_id, run_id);

-- ------------------------------------------------------------
-- RLS, want deze tabel draagt een organisatie_id
-- ------------------------------------------------------------
-- De invariantenpoort eist een policy op elke tabel met een
-- organisatie_id, en terecht: zonder policy leest de applicatierol de
-- rijen van elke organisatie. Dat is hier geen theoretisch punt — de
-- run-id van een andere organisatie zou anders te zien zijn.
alter table intel.machine_tokens enable row level security;

drop policy if exists machine_tokens_eigen_organisatie on intel.machine_tokens;
create policy machine_tokens_eigen_organisatie on intel.machine_tokens
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

-- GEEN UPDATE-RECHT. Een gebruikt token wordt nooit bijgewerkt; het
-- wordt geschreven en later opgeruimd. Delete mag, want de opruiming
-- draait onder de applicatierol.
grant select, insert, delete on intel.machine_tokens to vibe_intel_app;
