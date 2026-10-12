-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0015 sessie-intrekking
-- ------------------------------------------------------------
-- WAAROM:       De sessie is een staatloos HMAC-koekje. De ondertekende
--               lading bevat precies {g, o, v}: gebruiker, organisatie
--               en vervaltijd. Er zit geen sessie-id in en geen nonce.
--
--               Gevolg: er bestond GEEN ENKELE manier om een sessie in
--               te trekken. Een wachtwoordwijziging deed dat niet, want
--               het koekje verwijst nergens naar het wachtwoord. Wie een
--               geldig koekje had, hield tot de vervaltijd toegang —
--               acht uur lang, ook nadat het wachtwoord was gerouleerd.
--               Uitloggen wiste alleen de browserkant; het koekje zelf
--               bleef geldig.
--
--               Dat maakt wachtwoordrotatie betekenisloos tegen precies
--               de aanvaller waartegen je roteert: iemand die al binnen
--               is.
--
-- WAT DIT DOET: één kolom `sessie_epoch` op intel.gebruikers. De waarde
--               wordt meegetekend in de koekjeslading en bij ELK verzoek
--               tegen de database gehouden. Schuift de epoch op, dan
--               klopt elk eerder uitgegeven koekje niet meer en is de
--               gebruiker overal uitgelogd.
--
-- WAAROM EEN TELLER EN GEEN TIJDSTEMPEL:
--               Een tijdstempel vergelijken vraagt om kloksemantiek
--               (tijdzone, precisie, een koekje dat in dezelfde seconde
--               is uitgegeven als de rotatie). Een geheel getal dat
--               alleen maar omhoog gaat heeft die vragen niet: gelijk is
--               geldig, ongelijk is ongeldig.
--
-- TERUGDRAAIEN: `alter table intel.gebruikers drop column sessie_epoch;`
--               Daarna accepteert de code elk koekje zonder epoch weer,
--               dus draai dat alleen samen met de code terug.
-- ============================================================

begin;

alter table intel.gebruikers
  add column if not exists sessie_epoch integer not null default 1;

comment on column intel.gebruikers.sessie_epoch is
  'Intrekkingsanker voor sessies. Wordt meegetekend in het sessiekoekje en '
  'bij elk verzoek vergeleken. Verhogen = alle sessies van deze gebruiker '
  'onmiddellijk ongeldig. Wordt verhoogd door de wachtwoord-CLI.';

-- Een gebruiker zonder wachtwoord heeft nog geen sessie kunnen hebben;
-- de default 1 is dus voor iedereen een geldig startpunt.

-- ------------------------------------------------------------
-- RECHTEN: de applicatierol mag de epoch LEZEN, niet opschuiven
-- ------------------------------------------------------------
-- 0001_grondslag.sql:254 gaf `update` op de HELE tabel aan
-- vibe_intel_app. Daarmee kon het dashboard — de rol waarmee elk
-- onbekend verzoek de database raakt — in principe een wachtwoordhash
-- overschrijven en sessie-epochs opschuiven.
--
-- Gemeten wat de applicatie echt nodig heeft: precies één kolom.
--   src/dashboard/server.ts:357  update ... set laatste_login = now()
-- De enige andere update op deze tabel staat in src/cli/wachtwoord.ts en
-- dat is een OPERATORhandeling; die draait vanaf nu als eigenaar.
revoke update on intel.gebruikers from vibe_intel_app;
grant update (laatste_login) on intel.gebruikers to vibe_intel_app;

commit;
