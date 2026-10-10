-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0013 brondocument extra
-- ------------------------------------------------------------
-- WAAROM:       De parsers leveren per item een `extra`-object met de
--               velden die alleen die bron heeft, en dat werd
--               weggegooid. Juist daar zit de commercieel bruikbaarste
--               informatie: TenderNed geeft `opdrachtgeverNaam`
--               ('Gemeente Dijk en Waard') en `typePublicatie`, en de
--               SRU-bron geeft creator en gemeente.
--
--               Zonder die velden moet het commerciele signaal zijn
--               subject uit de titel raden. Mét die velden staat de
--               organisatie er gewoon in, en kan verificatie_status
--               op 'geverifieerd' in plaats van op een gok.
-- ADDITIVE:     JA — één jsonb-kolom met default '{}' en een GIN-index.
-- IDEMPOTENT:   JA — add column if not exists, create index if not exists.
-- DESTRUCTIEF:  NEE. Bestaande rijen krijgen '{}'; die wordt gevuld bij
--               de volgende ophaling waarin het item wijzigt, of na een
--               herbouw van de bronlaag.
-- ROLLBACK:     drop index if exists intel.brondocumenten_extra_gin;
--               alter table intel.brondocumenten drop column if exists extra;
-- ============================================================

set local lock_timeout = '5s';
set local statement_timeout = '120s';

alter table intel.brondocumenten
  add column if not exists extra jsonb not null default '{}'::jsonb;

comment on column intel.brondocumenten.extra is
  'Bronspecifieke velden zoals de parser ze zag. TenderNed: opdrachtgeverNaam, typePublicatie. SRU: creator, gemeente, soort. Nooit geinterpreteerd, alleen bewaard.';

create index if not exists brondocumenten_extra_gin
  on intel.brondocumenten using gin (extra jsonb_path_ops);

set local lock_timeout = default;
set local statement_timeout = default;
