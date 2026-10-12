-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0017 het ontbrekende kolomrecht
-- ------------------------------------------------------------
-- WAAROM:       Migratie 0015 nam vibe_intel_app het TABELBREDE
--               update-recht op intel.gebruikers af en gaf alleen
--               `laatste_login` terug. Dat was de bedoeling: het
--               dashboard mag geen wachtwoordhash overschrijven en geen
--               sessie-epoch opschuiven.
--
--               Eén kolom is daarbij over het hoofd gezien.
--               src/db/zaai.ts doet een upsert op intel.gebruikers:
--
--                 insert into intel.gebruikers (...) values (...)
--                 on conflict (lower(email)) do update set naam = excluded.naam
--
--               Die `do update set naam` heeft UPDATE op de kolom
--               `naam` nodig. Zonder dat recht faalt `npm run zaai` met
--               'permission denied for table gebruikers'.
--
--               Dat is in productie gebeurd: de api-deploy draait
--               `npm run migreer && npm run zaai && npm run geo` als
--               pre-deploy, de migraties liepen door en zaai viel om,
--               waardoor de deploy faalde. Railway bleef de vorige
--               versie bedienen, dus er is geen storing geweest — maar
--               de api bleef wel een release achter.
--
-- WAAROM DIT DE FOUT NIET VERBERGT:
--               Het alternatief was zaai als eigenaar laten draaien.
--               Dat lost het op door de hele vraag te omzeilen: dan
--               heeft het zaaiproces ALLE rechten op ALLE kolommen, en
--               is de grendel uit 0015 voor dat pad weg. Eén kolom
--               erbij houdt de grendel waar hij om gaat: de
--               applicatierol kan nog steeds niet aan
--               `wachtwoord_hash` en niet aan `sessie_epoch`.
--
-- WAT DE APPLICATIEROL NU MAG BIJWERKEN:
--               laatste_login  — src/dashboard/server.ts bij een inlog
--               naam           — src/db/zaai.ts bij herzaaien
--               en niets anders.
--
-- TERUGDRAAIEN: revoke update (naam) on intel.gebruikers from vibe_intel_app;
--               Dan faalt `npm run zaai` weer; draai het alleen samen
--               met een terugdraai van 0015.
-- ============================================================

begin;

grant update (naam) on intel.gebruikers to vibe_intel_app;

commit;
