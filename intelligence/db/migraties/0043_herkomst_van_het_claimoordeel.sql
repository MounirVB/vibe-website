-- ============================================================
-- 0043 — WIE ZETTE DIT CLAIMOORDEEL, EN WANNEER
-- ------------------------------------------------------------
-- WAAROM DEZE MIGRATIE BESTAAT.
--
-- 0042 gaf elke claim een modaliteit en elk document een soort, maar
-- raakte de BESTAANDE claims niet aan. Dat was bewust: een schemawijziging
-- die stil 59 historische beoordelingen herschrijft is precies wat een
-- preDeployCommand niet mag doen. Gemeten in productie op 30 oktober 2026,
-- met de R3-regels toegepast op de echte data:
--
--   claims in intel.uitspraken                59
--   oorspronkelijk bevestigd                  51
--   bevestiging BEHOUDEN onder R3              5   (alle van RVO)
--   bevestiging INGETROKKEN onder R3          46
--   bewijskracht verlaagd                     59
--   claims zonder brongegevens                 0
--   getroffen gebeurtenissen                  18
--
-- Die 46 staan in productie nog op 'bevestigd' met bewijs_kwaliteit 5.
-- Ze moeten herbeoordeeld worden, en die herbeoordeling moet AUDITEERBAAR
-- en OMKEERBAAR zijn. Dat vraagt één gegeven dat er nog niet is: wie het
-- huidige oordeel heeft gezet.
--
-- ------------------------------------------------------------
-- DE MEETWAARDE DIE DEZE KOLOM VERANTWOORDT
--
-- Vandaag is er precies ÉÉN plek die intel.uitspraken.verificatie_status
-- zet: src/pijplijn/uitspraken.ts regel 506, in de pijplijn. Het dashboard
-- LEEST de status (regels 880, 898, 1657, 2541) en zet hem nergens; er is
-- geen formulier, geen route en geen CLI die een mens een claimstatus laat
-- wijzigen. Alle 59 bestaande oordelen komen dus van de motor.
--
-- Dat is vandaag zo en hoeft het morgen niet te blijven. Zodra er een
-- redactionele claimbeoordeling komt, moet de herverwerking die met rust
-- laten — eis 3 van de R3-acceptatieopdracht: geen stilzwijgende
-- overschrijving van menselijke beoordelingen. Zonder deze kolom is dat
-- niet te zien en zou de herverwerking een menselijk oordeel wegvagen
-- zonder dat iemand het merkt.
--
-- ------------------------------------------------------------
-- WAAROM NULLABLE EN ZONDER DEFAULT
--
-- Een `default 'motor'` zou alle 59 rijen een waarde geven die niemand
-- heeft vastgesteld. Dat die waarde toevallig juist IS (zie de meting
-- hierboven) maakt het geen vaststelling; het maakt het een aanname die
-- later niet van een meting te onderscheiden is. NULL betekent hier
-- 'niet vastgelegd', en de herverwerking behandelt NULL als
-- herbeoordeelbaar — met de meting hierboven als verantwoording.
--
-- GEEN DML. Deze migratie bevat nul insert-, update- en delete-statements.
-- Hij raakt geen enkele bestaande waarde aan. De herbeoordeling zelf is
-- een AFZONDERLIJKE, expliciet aangeroepen verwerking
-- (src/pijplijn/herbeoordeling.ts, npm run herbeoordeel) en geen onderdeel
-- van een deployment.
--
-- ROLLBACK. Geen databaseactie nodig: de kolommen zijn nullable en worden
-- alleen gelezen door code die met deze release meekomt.
-- ============================================================

alter table intel.uitspraken
  add column if not exists oordeel_bron text;

alter table intel.uitspraken
  drop constraint if exists uitspraken_oordeel_bron;
alter table intel.uitspraken
  add constraint uitspraken_oordeel_bron check (
    oordeel_bron is null or oordeel_bron in ('motor', 'mens'));

comment on column intel.uitspraken.oordeel_bron is
  'Wie zette de huidige verificatie_status: ''motor'' (de pijplijn) of ''mens'' (een '
  'redactioneel oordeel). De herbeoordeling van R3 slaat ''mens'' OVER en raakt dus geen '
  'menselijke beoordeling aan. NULL betekent: niet vastgelegd. Gemeten op 30 oktober 2026 was '
  'er precies één schrijver van verificatie_status — src/pijplijn/uitspraken.ts regel 506 — dus '
  'alle bestaande oordelen komen van de motor; de herbeoordeling behandelt NULL daarom als '
  'herbeoordeelbaar.';

alter table intel.uitspraken
  add column if not exists herbeoordeeld_op timestamptz;

comment on column intel.uitspraken.herbeoordeeld_op is
  'Wanneer de R3-herbeoordeling deze claim voor het laatst heeft gewogen. Samen met '
  'modaliteit_versie en bewijskracht_plafond maakt dit de uitslag herleidbaar: welke motor, '
  'welk moment, welk plafond. NULL betekent: nog niet herbeoordeeld — en dat is precies de '
  'stand waarop de geldigheidscontrole in nieuwsselectie en besluitmotor DICHT valt.';

-- Voor de herverwerkingslus: welke claims zijn nog niet gewogen door de
-- huidige motor. Partieel, want de verwerkte rijen hoeven niet in de index.
create index if not exists uitspraken_herbeoordeling_idx
  on intel.uitspraken (organisatie_id, id)
  where herbeoordeeld_op is null;

-- ---------------------------------------------------------------- 3
-- De HERKOMST van een teruggevonden origineel.
--
-- WAAROM DIT ERBIJ KOMT. 0042 gaf `uitspraken.primaire_bron_bevestigd`
-- als boolean. Een audit over de verificatielaag wees dat aan als een
-- oordeel zonder grondslag: welke claim bij welk document het origineel
-- was, en volgens welke motorversie, werd weggegooid. Elk ander oordeel
-- in dit schema draagt zijn grondslag (materialiteit_grondslag,
-- relevantie_grondslag, documentsoort_grondslag, modaliteit_grondslag);
-- deze niet.
--
-- Twee gevolgen die dat had. Een onjuiste TERUGGEVONDEN was achteraf
-- niet te vinden en niet na te rekenen. En de vlag was GELATCHT: de
-- werkvoorraad sloot `primaire_bron_bevestigd` uit, dus een eenmaal
-- gezette waarde werd nooit meer herzien — ook niet na een nieuwe
-- motorversie, een intrekking bij het gezag of een herclassificatie.
--
-- Met een versiestempel erbij is de vlag niet meer gelatcht: verandert
-- de motorversie, dan valt de claim opnieuw in de werkvoorraad.

alter table intel.uitspraken
  add column if not exists primaire_bron_uitspraak_id bigint
    references intel.uitspraken(id) on delete set null;

comment on column intel.uitspraken.primaire_bron_uitspraak_id is
  'WELKE claim bij het bevoegde gezag als origineel is aangewezen. Zonder dit veld is een '
  'TERUGGEVONDEN-uitslag niet na te rekenen en een onjuiste match niet te vinden.';

alter table intel.uitspraken
  add column if not exists primaire_bron_grondslag jsonb not null default '{}'::jsonb;

comment on column intel.uitspraken.primaire_bron_grondslag is
  'Waarom deze match het origineel is: het gezag, het document, de gelijke grootheid en de '
  'getoetste voorwaarden. Of, bij een afwijzing, waarom er GEEN match is — inclusief het geval '
  'dat er meerdere kandidaten waren en de uitslag daarom AMBIGU is in plaats van TERUGGEVONDEN.';

alter table intel.uitspraken
  add column if not exists primaire_bron_versie text;

comment on column intel.uitspraken.primaire_bron_versie is
  'BRONVERIFICATIE_VERSIE van de motor die deze uitslag vormde. Hiermee is de vlag niet '
  'gelatcht: bij een nieuwe motorversie valt de claim opnieuw in de werkvoorraad.';

create index if not exists uitspraken_bronverificatie_idx
  on intel.uitspraken (organisatie_id, id)
  where primaire_bron_versie is null;
