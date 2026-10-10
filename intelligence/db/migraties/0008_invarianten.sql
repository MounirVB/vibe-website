-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0008 invarianten
-- ------------------------------------------------------------
-- Een ontbrekende index die bij de eerste controle boven kwam, en
-- een functie die de beveiligingsaannames in de database zelf
-- controleert. Die functie draait in `npm run poort` en in de
-- testsuite, zodat een latere migratie niet stil een gat kan
-- achterlaten.
-- ============================================================

-- Kwam uit de FK-indexcontrole: deze verwijzing had geen eigen index.
create index if not exists uitspraak_geo_versie_idx
  on intel.uitspraak_geo (versie_id)
  where versie_id is not null;

-- ------------------------------------------------------------
-- Tabellen die bewust geen RLS hebben. Alles wat hier niet in
-- staat moet RLS aan hebben; de controlefunctie meldt afwijkingen.
-- ------------------------------------------------------------
create table if not exists intel.rls_uitzonderingen (
  tabelnaam text primary key,
  reden     text not null
);

insert into intel.rls_uitzonderingen (tabelnaam, reden) values
  ('migraties',          'infrastructuur, geen tenantdata'),
  ('rollen',             'vaste rollijst, gedeeld'),
  ('rol_rechten',        'rechtenmatrix, gedeeld en alleen leesbaar'),
  ('geo_bereiken',       'referentiegeografie uit officiele bronnen; app mag alleen lezen'),
  ('ai_prijzen',         'tariefkaart, gedeeld en alleen leesbaar'),
  ('rls_uitzonderingen', 'deze lijst zelf')
on conflict (tabelnaam) do update set reden = excluded.reden;

grant select on intel.rls_uitzonderingen to vibe_intel_app, vibe_intel_lezer;

-- ------------------------------------------------------------
-- Invariantencontrole. Geeft één rij per bevinding; geen rijen
-- betekent dat alle aannames kloppen.
-- ------------------------------------------------------------
create or replace function intel_priv.controleer_invarianten()
returns table (soort text, onderwerp text, bevinding text)
language sql
stable
set search_path = ''
as $$
  -- 1. Elke tabel buiten de uitzonderingslijst heeft RLS aan.
  select 'rls_ontbreekt', t.tablename::text,
         'tabel intel.' || t.tablename || ' heeft geen row level security'
    from pg_tables t
    join pg_class c on c.relname = t.tablename and c.relnamespace = 'intel'::regnamespace
   where t.schemaname = 'intel'
     and not c.relrowsecurity
     and t.tablename not in (select r.tabelnaam from intel.rls_uitzonderingen r)

  union all
  -- 2. Elke tabel met RLS heeft minstens een policy.
  select 'policy_ontbreekt', c.relname::text,
         'tabel intel.' || c.relname || ' heeft RLS aan maar geen policy'
    from pg_class c
   where c.relnamespace = 'intel'::regnamespace
     and c.relkind = 'r'
     and c.relrowsecurity
     and not exists (select 1 from pg_policy p where p.polrelid = c.oid)

  union all
  -- 3. Geen functie in intel of intel_priv mag EXECUTE aan PUBLIC geven.
  --    Postgres doet dat standaard wel; elke migratie moet het terugnemen.
  select 'functie_publiek', n.nspname || '.' || p.proname,
         'functie ' || n.nspname || '.' || p.proname || ' is uitvoerbaar door PUBLIC'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('intel', 'intel_priv')
     and has_function_privilege('public', p.oid, 'EXECUTE')

  union all
  -- 4. De applicatierol mag geen RLS kunnen omzeilen.
  select 'rol_te_machtig', r.rolname::text,
         'rol ' || r.rolname || ' heeft superuser of BYPASSRLS'
    from pg_roles r
   where r.rolname in ('vibe_intel_app', 'vibe_intel_lezer')
     and (r.rolsuper or r.rolbypassrls)

  union all
  -- 5. De applicatierol mag nergens eigenaar zijn.
  select 'rol_is_eigenaar', t.tablename::text,
         'vibe_intel_app is eigenaar van intel.' || t.tablename
    from pg_tables t
   where t.schemaname = 'intel' and t.tableowner = 'vibe_intel_app'

  union all
  -- 6. Het auditspoor en de publicatiebesluiten mogen niet muteerbaar
  --    zijn voor de applicatie.
  select 'audit_muteerbaar', x.tabel,
         'vibe_intel_app heeft ' || x.recht || ' op intel.' || x.tabel
    from (
      select 'audit_gebeurtenissen'::text as tabel, r.recht
        from (values ('UPDATE'), ('DELETE')) as r(recht)
      union all
      select 'publicatiebesluiten'::text, r.recht
        from (values ('UPDATE'), ('DELETE')) as r(recht)
    ) x
   where has_table_privilege('vibe_intel_app', ('intel.' || x.tabel)::regclass, x.recht)

  union all
  -- 7. De applicatierol mag niet schrijven in de referentiegeografie.
  select 'geo_schrijfbaar', 'geo_bereiken',
         'vibe_intel_app heeft ' || r.recht || ' op intel.geo_bereiken'
    from (values ('INSERT'), ('UPDATE'), ('DELETE')) as r(recht)
   where has_table_privilege('vibe_intel_app', 'intel.geo_bereiken'::regclass, r.recht)

  union all
  -- 8. Hoog risico mag nooit automatisch publiceren, ongeacht beleid.
  select 'beleid_te_ruim', b.versie,
         'publicatiebeleid ' || b.versie || ' staat automatisch publiceren toe bij risico ' || b.auto_max_risico
    from intel.publicatiebeleid b
   where b.actief and b.auto_publiceren_aan and b.auto_max_risico = 'hoog'
$$;

comment on function intel_priv.controleer_invarianten() is
  'Geen rijen = alle beveiligingsaannames kloppen. Draait in npm run poort en in de testsuite.';

revoke all on function intel_priv.controleer_invarianten() from public;
grant execute on function intel_priv.controleer_invarianten() to vibe_intel_app, vibe_intel_lezer;
