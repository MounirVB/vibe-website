-- ============================================================
-- 0056 — een zesde aanleiding voor een menselijke claimbeoordeling
-- ------------------------------------------------------------
-- HET GEMETEN DEFECT, 6 november 2026.
--
-- Taak 6887 (semantiek:2026-11-06T08) stond in productie in de DLQ:
--
--   new row for relation "uitspraken" violates check constraint
--   "uitspraken_bevestigd_vraagt_direct"
--
-- vulBewijsniveauIn() werkte elke rij met dezelfde claim_afdruk bij.
-- Zat daar een rij tussen die al 'bevestigd' was, en kwam het niveau
-- niet op DIRECT_BEVESTIGD uit, dan weigerde 0055 de UPDATE en viel de
-- hele ronde om. Vijf pogingen later lag de complete semantiekstap
-- stil: 150 van 170 claims zonder bewijsniveau, en de claims van die
-- ochtend zonder verwoordbaarheidsoordeel.
--
-- DE GRENDEL VAN 0055 BLIJFT ONAANGERAAKT. Een bevestigde claim mag
-- nog steeds alleen DIRECT_BEVESTIGD dragen; MEERVOUDIG_BEVESTIGD is
-- nog steeds geen vaststelling. Wat verandert is wat er GEBEURT met de
-- rijen waar status en niveau elkaar tegenspreken: zij krijgen geen
-- label (geen label is geen bewering) en gaan naar het bestaande
-- claimbeoordelingsregister, zodat een mens ernaar kijkt in plaats van
-- dat een taak erop omvalt.
--
-- Dat register (0047) staat alleen vijf aanleidingen toe. Deze
-- migratie voegt de zesde toe. Puur additief: geen kolom verdwijnt,
-- geen rij verandert, geen bestaande waarde wordt ongeldig.
-- ============================================================

alter table intel.claimbeoordeling
  drop constraint if exists claimbeoordeling_aanleiding_geldig;

alter table intel.claimbeoordeling
  add constraint claimbeoordeling_aanleiding_geldig check (
    aanleiding in ('ACHTERGRONDPASSAGE', 'ANDER_GEZAG', 'ONTWERP',
                   'NIET_VASTSTELLENDE_MODALITEIT', 'GEEN_AUTHENTIEK_STUK',
                   'BEWIJSNIVEAU_STRIJDIG_MET_STATUS'));

comment on constraint claimbeoordeling_aanleiding_geldig on intel.claimbeoordeling is
  'De zes aanleidingen waarop een claim naar een mens gaat. '
  'BEWIJSNIVEAU_STRIJDIG_MET_STATUS (0056): de claim staat op bevestigd '
  'terwijl het bewijsniveau die status niet draagt. De claim houdt geen '
  'niveau en wordt niet afgewaardeerd; een mens beslist.';
