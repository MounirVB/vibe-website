-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0026 RLS-uitzondering voor de vocabulaires
-- ------------------------------------------------------------
-- WAAROM:       intel.fenomenen en intel.subjecten (0024) hebben geen
--               row level security, en intel_priv.controleer_invarianten()
--               meldt dat terecht als bevinding. Die invariant hoort niet
--               verzwakt te worden; de uitzondering hoort geregistreerd
--               te staan met een reden.
--
--               Het zijn vocabulaires: ons eigen woordenboek van
--               grootheden en subjecten. Gedeeld over alle organisaties,
--               zonder organisatie_id, en voor de applicatierol alleen
--               leesbaar. Daarmee vallen ze in dezelfde categorie als
--               intel.geo_bereiken en intel.ai_prijzen, die er al in
--               staan.
--
-- WAAROM EEN EIGEN MIGRATIE EN NIET IN 0024
--               0024 was al toegepast. Hem aanpassen gaf drift op de
--               checksum, en de poort meldde dat — precies zoals bedoeld.
--               Een toegepaste migratie wijzig je niet; je schrijft een
--               nieuwe.
--
-- TERUGDRAAIEN: delete from intel.rls_uitzonderingen
--                where tabelnaam in ('fenomenen','subjecten');
-- ============================================================

begin;

insert into intel.rls_uitzonderingen (tabelnaam, reden) values
  ('fenomenen', 'vocabulaire van grootheden; gedeeld, geen tenantdata, alleen leesbaar'),
  ('subjecten', 'vocabulaire van subjecten; gedeeld, geen tenantdata, alleen leesbaar')
on conflict (tabelnaam) do update set reden = excluded.reden;

commit;
