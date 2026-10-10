-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0010 bronsoort tijdreeks
-- ------------------------------------------------------------
-- WAAROM:       De day-ahead prijsbron levert parallelle arrays
--               (unix_seconds + price), geen lijst van objecten. Dat
--               is een eigen brontype geworden, `tijdreeks`, dat per
--               kalenderdag één item samenvat. De check-constraint op
--               intel.bronnen.soort kende die waarde nog niet, dus
--               het zaaien liep erop vast.
-- ADDITIVE:     JA — alleen de toegestane waardenverzameling wordt
--               groter. Geen bestaande rij wordt ongeldig.
-- IDEMPOTENT:   JA — de constraint wordt eerst gedropt als hij bestaat.
-- DESTRUCTIEF:  NEE.
-- ROLLBACK:     alter table intel.bronnen drop constraint bronnen_soort_check;
--               alter table intel.bronnen add constraint bronnen_soort_check
--                 check (soort in ('rss','atom','json_api','odata','sru',
--                                 'sitemap','html_lijst','dataset','wfs'));
--               (werkt alleen als er geen rij met soort='tijdreeks' meer staat)
-- ============================================================

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $$
begin
  if exists (select 1 from pg_constraint
              where conname = 'bronnen_soort_check'
                and conrelid = 'intel.bronnen'::regclass) then
    alter table intel.bronnen drop constraint bronnen_soort_check;
  end if;

  alter table intel.bronnen add constraint bronnen_soort_check
    check (soort in (
      'rss', 'atom', 'json_api', 'odata', 'sru',
      'sitemap', 'html_lijst', 'dataset', 'tijdreeks', 'wfs'));
end $$;

comment on column intel.bronnen.soort is
  'tijdreeks = parallelle arrays met tijdstempels en waarden; wordt per kalenderdag tot één item samengevat.';

set local lock_timeout = default;
set local statement_timeout = default;
