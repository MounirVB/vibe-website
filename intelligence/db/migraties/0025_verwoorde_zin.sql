-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0025 de verwoorde zin bewaren
-- ------------------------------------------------------------
-- WAAROM:       De zin werd twee keer gemaakt: één keer bij het
--               beoordelen door de poort, en één keer bij het weergeven.
--               Die twee konden uiteenlopen, en liepen uiteen: uitspraak
--               45 stond op VERWOORDBAAR terwijl een tweede verwoording
--               uit de opgeslagen velden null gaf.
--
--               Eén waarheid dus: de zin die de poort heeft goedgekeurd
--               wordt bewaard. Wie hem weergeeft, leest hem; niemand
--               leidt hem opnieuw af.
--
-- EN EEN TWEEDE GRENS: SCOPE
--               `scope_waarschuwing` legt vast dat de bronzin een
--               organisatie noemt die niet in ons subjectvocabulaire
--               staat. Gemeten geval: "Gasunie Transport Services heeft
--               een stijging van 4,5% gecommuniceerd voor haar tarieven"
--               werd "stijgt het nettarief met 4,5%" — een uitspraak
--               over de gastarieven van één netbeheerder werd een
--               algemene uitspraak over het nettarief. Dat is een
--               overschrijding van de scope, en par. 8 verbiedt die.
--
-- WAT DIT DOET: additief, twee kolommen.
--
-- TERUGDRAAIEN: alter table intel.uitspraken
--                 drop column verwoorde_zin, drop column scope_waarschuwing;
-- ============================================================

begin;

alter table intel.uitspraken
  add column if not exists verwoorde_zin text,
  add column if not exists scope_waarschuwing text;

-- BESTAANDE RIJEN EERST.
-- Een eerdere backfillronde heeft `verwoordbaar` gezet toen deze kolom
-- nog niet bestond. Die rijen kunnen de constraint hieronder niet halen.
--
-- `verwoordbaar` is een AFGELEID oordeel, geen bewijs: het wordt bij
-- elke backfillronde opnieuw bepaald uit de bronzin. Het op null zetten
-- gooit dus niets weg wat niet herberekend kan worden, en het alternatief
-- (de constraint als NOT VALID toevoegen) zou de inconsistentie laten
-- staan die deze migratie juist moet uitsluiten.
--
-- De uitspraak zelf, zijn waarde, zijn bronkoppeling en zijn
-- verificatiestatus blijven onaangeroerd.
update intel.uitspraken
   set verwoordbaar = null,
       verwoordbaar_reden = null,
       verwoordbaar_op = null
 where verwoordbaar = 'VERWOORDBAAR'
   and verwoorde_zin is null;

-- EEN VERWOORDBARE UITSPRAAK HEEFT ZIJN ZIN.
-- Zonder deze constraint kon VERWOORDBAAR blijven staan terwijl er geen
-- zin uit te krijgen was, en dat was precies de inconsistentie.
alter table intel.uitspraken drop constraint if exists uitspraken_verwoordbaar_heeft_zin;
alter table intel.uitspraken add constraint uitspraken_verwoordbaar_heeft_zin check (
  verwoordbaar is distinct from 'VERWOORDBAAR'
  or (verwoorde_zin is not null and length(verwoorde_zin) >= 25));

comment on column intel.uitspraken.verwoorde_zin is
  'De Nederlandse zin die de verwoordbaarheidspoort heeft goedgekeurd. Opgebouwd uit '
  'intel.fenomenen en intel.subjecten — eigen woorden, geen brontekst. Bewaard zodat '
  'weergeven en beoordelen niet uiteen kunnen lopen.';
comment on column intel.uitspraken.scope_waarschuwing is
  'Gezet als de bronzin een organisatie noemt die niet in het subjectvocabulaire staat. '
  'Dan is de uitspraak niet veilig te attribueren en wordt hij niet verwoordbaar.';

commit;
