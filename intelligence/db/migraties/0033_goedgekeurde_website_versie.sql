-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0033 de website waarop is goedgekeurd
-- ------------------------------------------------------------
-- WAAROM:       De precheckcontrole "website onveranderd sinds
--               goedkeuring" kon niets bewijzen.
--
--               publicatiePrecheck() kreeg ZOWEL `websiteVersie` (de
--               versie waarop is goedgekeurd) ALS
--               `huidigeWebsiteVersie` van de AANROEPER. Een aanroeper
--               die tweemaal dezelfde waarde doorgaf — bijvoorbeeld
--               omdat hij beide uit het artefact leest dat hij net heeft
--               ingelezen — kreeg PASS, terwijl de doelpagina sinds de
--               goedkeuring herschreven kon zijn. De goedgekeurde alinea
--               landt dan in een sectie die niet meer bestaat.
--
--               Er was ook geen kolom om het in te bewaren: grep op
--               website_versie in 0021, 0022, 0029 en 0030 gaf niets.
--
-- WAT DIT DOET: één kolom op intel.inhoud_voorstellen die vastlegt op
--               WELKE websiteversie een goedkeuring is gegeven, plus een
--               vormcontrole (sha256 of null). Vanaf 3.0.4 schrijft
--               beoordeel() hem bij goedkeuring, GEMETEN uit het
--               sitekennisartefact en niet uit invoer. De precheck leest
--               hem uit de rij, zodat hij twee ONAFHANKELIJKE waarden
--               vergelijkt.
--
--               Bestaande rijen krijgen null. Dat is juist: voor een
--               goedkeuring van vóór deze migratie is niet vast te
--               stellen op welke versie ze is gegeven. publicatiePrecheck
--               geeft dan FAIL met die reden — en dat is de veilige kant.
--
-- TERUGDRAAIEN: alter table intel.inhoud_voorstellen
--                 drop column goedgekeurde_website_versie;
-- ============================================================

alter table intel.inhoud_voorstellen
  add column if not exists goedgekeurde_website_versie text;

alter table intel.inhoud_voorstellen
  drop constraint if exists voorstellen_website_versie_vorm;
alter table intel.inhoud_voorstellen
  add constraint voorstellen_website_versie_vorm check (
    goedgekeurde_website_versie is null
    or goedgekeurde_website_versie ~ '^[0-9a-f]{64}$');

comment on column intel.inhoud_voorstellen.goedgekeurde_website_versie is
  'De websiteVersie uit het sitekennisartefact zoals die gold TOEN een mens goedkeurde. '
  'Gemeten door de aanroeper uit het artefact, nooit uit invoer. publicatiePrecheck '
  'vergelijkt deze met de versie die op het moment van publiceren geldt; zonder deze kolom '
  'kreeg die controle beide waarden van dezelfde aanroeper en bewees hij niets.';
