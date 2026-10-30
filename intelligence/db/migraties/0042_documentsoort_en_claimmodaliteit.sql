-- ============================================================
-- 0042 — DE SOORT VAN EEN DOCUMENT EN DE MODALITEIT VAN EEN CLAIM
-- ------------------------------------------------------------
-- WAT ER GEMETEN IS, EN WAAROM DIT DE KERN VAN R3 IS.
--
-- De bewijskracht van elke claim kwam tot nu toe van de UITGEVER en niet
-- van het DOCUMENT. In src/pijplijn/uitspraken.ts stond het op één regel:
--
--   magBevestigen    = invoer.isPrimaireBron && invoer.betrouwbaarheid >= 4
--   bewijs_kwaliteit = min(5, max(1, invoer.betrouwbaarheid))
--
-- Beide getallen staan in intel.bronnen en horen bij de partij, niet bij
-- het stuk tekst. `netbeheer-nederland-nieuws` staat daar met
-- betrouwbaarheid 5 en is_primaire_bron true. Gemeten in productie op
-- 30 oktober 2026:
--
--   bron                        claims  bevestigd  max bk  gem bk
--   netbeheer-nederland-nieuws      45         45       5     5,0
--   rvo-opendata-artikelen           5          5       5     5,0
--   tenderned-publicaties            1          1       5     5,0
--   solar365                         3          0       3     3,0
--   installatie-nl                   2          0       3     3,0
--   warmte365                        2          0       3     3,0
--   energy-storage-nl                1          0       4     4,0
--
-- 45 van de 51 bevestigde claims in het hele platform kwamen uit één
-- branchevereniging, alle met de hoogste bewijskracht die dit systeem
-- kent. En de documenten eronder zijn niet van één soort. Drie
-- voorbeelden uit precies die 45:
--
--   'ACM stelt de nettarieven voor 2026 vast'
--       -> een branchevereniging die een besluit van de TOEZICHTHOUDER
--          navertelt. Netbeheer Nederland is niet de bron van dat besluit.
--   'Bouw versnelt opnieuw, maar de vraag loopt nog steeds op'
--       -> eigen wachtlijstcijfers, waarvan zij wél de bron zijn.
--   'Inbreng voor het eerste debat Netcongestie van de nieuwe Kamer'
--       -> een lobbydocument. De claim die eruit kwam, bevestigd en met
--          bewijs_kwaliteit 5:
--            'Schaal daarom de bestaande Flex-E-regeling op naar een
--             Flex-E regeling XL van structureel EUR 125 miljoen per
--             jaar (2027-2030).'
--
-- Die laatste is een VERZOEK aan de Tweede Kamer, opgeslagen als
-- vastgesteld feit. Een artikel dat erop bouwt publiceert een lobbywens
-- als beleid.
--
-- ------------------------------------------------------------
-- WAT DEZE MIGRATIE DOET
--
-- Twee dingen, en beide zijn alleen OPSLAG. De oordelen zelf worden
-- gevormd in src/pijplijn/documentsoort.ts en
-- src/pijplijn/claimmodaliteit.ts — puur, zonder database, zonder
-- netwerk en zonder taalmodel, zodat ze reproduceerbaar zijn en in een
-- audit standhouden.
--
--   1. brondocument_versies krijgt de soort van het document, het gezag
--      van de uitgever, de grondslag, de versie van de classificatie en
--      de onzekerheid. Per VERSIE en niet per document: de tekst kan
--      tussen versies veranderen en dan verandert de soort mee.
--      intel.uitspraak_bronnen verwijst al naar versie_id, dus de
--      classificatie hangt aan precies het stuk tekst waarop een claim
--      rust.
--
--   2. uitspraken krijgt de modaliteit — staat het vast, is het
--      voorgesteld of is het een verwachting — plus het plafond dat de
--      documentsoort aan de bewijskracht stelde en of het oorspronkelijke
--      besluit bij het bevoegde gezag is teruggevonden.
--
-- ------------------------------------------------------------
-- WAAROM ALLES NULLABLE IS, EN WAAROM DAT GEEN SLORDIGHEID IS
--
-- NULL betekent hier 'nog niet beoordeeld' en nooit een waarde. Dat is
-- dezelfde keuze als bij uitspraken.toepassingsgebied in 0038, en om
-- dezelfde reden: een default zou 3.483 bestaande documentversies en 59
-- bestaande claims een oordeel geven dat niemand heeft gevormd. De
-- classificatietaak vult ze daarna, en tot die tijd is in de uitvoer te
-- zien dat het oordeel ontbreekt in plaats van dat het geraden is.
--
-- GEEN DATAMUTATIE. Deze migratie bevat nul insert-, update- of
-- delete-statements. Bestaande classificaties bestaan niet, dus er kan
-- er ook geen verloren gaan. RLS en rollen worden niet aangeraakt: de
-- kolommen vallen onder het bestaande beleid van hun tabel.
--
-- ROLLBACK. Terugdraaien vraagt geen databaseactie. De kolommen zijn
-- nullable en worden alleen gelezen door code die met deze release
-- meekomt; een revert van de code laat ze ongebruikt achter. Wie ze
-- echt weg wil, doet `alter table ... drop column`, maar dat is een
-- eigen besluit met een eigen migratie en geen onderdeel van een
-- terugdraaiing.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- De soort van een documentversie.

alter table intel.brondocument_versies
  add column if not exists documentsoort text;

alter table intel.brondocument_versies
  drop constraint if exists versies_documentsoort;
alter table intel.brondocument_versies
  add constraint versies_documentsoort check (
    documentsoort is null or documentsoort in (
      'OFFICIEEL_BESLUIT',
      'OFFICIELE_REGELGEVING',
      'FEITELIJKE_MEDEDELING',
      'ONDERZOEKSRAPPORT',
      'SECTORANALYSE',
      'PERSBERICHT',
      'OPINIE',
      'LOBBYDOCUMENT',
      'SECUNDAIRE_BERICHTGEVING',
      'ONVOLDOENDE_VERIFIEERBAAR'));

comment on column intel.brondocument_versies.documentsoort is
  'Wat IS dit document: de tien soorten uit R3, van OFFICIEEL_BESLUIT tot '
  'ONVOLDOENDE_VERIFIEERBAAR. Vastgesteld door bepaalDocumentsoort() in '
  'src/pijplijn/documentsoort.ts uit titel, tekst, URL en het gezag van de uitgever. '
  'NULL betekent: nog niet geclassificeerd — niet FEITELIJKE_MEDEDELING.';

alter table intel.brondocument_versies
  add column if not exists documentsoort_gezag text;

alter table intel.brondocument_versies
  drop constraint if exists versies_documentsoort_gezag;
alter table intel.brondocument_versies
  add constraint versies_documentsoort_gezag check (
    documentsoort_gezag is null or documentsoort_gezag in (
      'BEVOEGD_GEZAG', 'NETBEHEERDER', 'STATISTIEK', 'BELANGENBEHARTIGER', 'MARKT'));

comment on column intel.brondocument_versies.documentsoort_gezag is
  'Wat de UITGEVER mag vaststellen, los van hoe betrouwbaar hij is. Een branchevereniging '
  'kan volstrekt betrouwbaar zijn over eigen cijfers en toch geen bevoegdheid hebben om een '
  'tarief vast te stellen. OFFICIEEL_BESLUIT en OFFICIELE_REGELGEVING zijn per constructie '
  'alleen bereikbaar bij BEVOEGD_GEZAG; brontekst kan een document nooit omhoog classificeren.';

alter table intel.brondocument_versies
  add column if not exists documentsoort_grondslag jsonb not null default '{}'::jsonb;

comment on column intel.brondocument_versies.documentsoort_grondslag is
  'Welke signalen vuurden, met het getroffen tekstfragment erbij, plus de uitleg waarom het '
  'deze soort werd en welke soorten het gezag blokkeerde. Zonder dit is de uitslag niet na te '
  'rekenen zonder de motor te draaien.';

alter table intel.brondocument_versies
  add column if not exists documentsoort_versie text;

comment on column intel.brondocument_versies.documentsoort_versie is
  'DOCUMENTSOORT_VERSIE van de motor die dit oordeel vormde. Een nieuwe versie betekent dat '
  'een herclassificatie andere uitslagen kan geven; zonder dit veld is niet te zien welke '
  'rijen nog van de oude regels komen.';

alter table intel.brondocument_versies
  add column if not exists documentsoort_onzekerheid numeric(3,2);

alter table intel.brondocument_versies
  drop constraint if exists versies_documentsoort_onzekerheid;
alter table intel.brondocument_versies
  add constraint versies_documentsoort_onzekerheid check (
    documentsoort_onzekerheid is null
    or (documentsoort_onzekerheid >= 0 and documentsoort_onzekerheid <= 1));

comment on column intel.brondocument_versies.documentsoort_onzekerheid is
  '0,00-1,00. Nul betekent niet "zeker" maar "geen tegenstrijdige signalen"; de waarde is '
  'bedoeld om een redactielijst te sorteren, niet om een kans uit te drukken.';

alter table intel.brondocument_versies
  add column if not exists beschrijft_besluit_van text;

comment on column intel.brondocument_versies.beschrijft_besluit_van is
  'Welk ANDER gezag in deze tekst handelt. Gevuld zodra een document een besluit van een '
  'andere partij navertelt ("ACM stelt vast") en de uitgever dat gezag niet is. De claimlaag '
  'gebruikt dit om te eisen dat het origineel ook bij de bevoegde instantie is gezien voordat '
  'een claim als vastgesteld geldt.';

-- Voor de redactielijst: welke documenten vragen aandacht, nieuwste eerst.
create index if not exists versies_documentsoort_idx
  on intel.brondocument_versies (organisatie_id, documentsoort, opgehaald_op desc)
  where documentsoort is not null;

-- ---------------------------------------------------------------- 2
-- De modaliteit van een claim.

alter table intel.uitspraken
  add column if not exists modaliteit text;

alter table intel.uitspraken
  drop constraint if exists uitspraken_modaliteit;
alter table intel.uitspraken
  add constraint uitspraken_modaliteit check (
    modaliteit is null or modaliteit in ('VASTGESTELD', 'VOORSTEL', 'VERWACHTING'));

comment on column intel.uitspraken.modaliteit is
  'Staat dit vast, wordt het voorgesteld, of is het een verwachting. Vastgesteld door '
  'bepaalModaliteit() in src/pijplijn/claimmodaliteit.ts uit de zin zelf, met de documentsoort '
  'als aanvullend maar niet beslissend signaal. Dit is iets anders dan verificatie_status: een '
  'claim kan bevestigd zijn EN een voorstel beschrijven. NULL betekent: nog niet beoordeeld.';

alter table intel.uitspraken
  add column if not exists modaliteit_zekerheid numeric(3,2);

alter table intel.uitspraken
  drop constraint if exists uitspraken_modaliteit_zekerheid;
alter table intel.uitspraken
  add constraint uitspraken_modaliteit_zekerheid check (
    modaliteit_zekerheid is null
    or (modaliteit_zekerheid >= 0 and modaliteit_zekerheid <= 1));

comment on column intel.uitspraken.modaliteit_zekerheid is
  'Hoe zeker de modaliteit is. Onder NOODZAKELIJKE_ZEKERHEID (0,50) is de modaliteit geraden '
  'en mag de claim niet als vaststaand feit in een artikel. Een zin zonder enig signaal krijgt '
  'VASTGESTELD met 0,35 en is dus NIET draagbaar — de veilige kant is hier niet "vastgesteld".';

alter table intel.uitspraken
  add column if not exists modaliteit_versie text;

comment on column intel.uitspraken.modaliteit_versie is
  'MODALITEIT_VERSIE van de motor die dit oordeel vormde.';

alter table intel.uitspraken
  add column if not exists modaliteit_grondslag jsonb not null default '{}'::jsonb;

comment on column intel.uitspraken.modaliteit_grondslag is
  'De signalen met hun getroffen fragment, plus de uitleg. Een afronding ("ongeveer") staat '
  'hier als demper van de zekerheid en niet als modaliteit: een gemeten jaarcijfer dat afgerond '
  'is opgeschreven blijft een vaststelling. Dat onderscheid is in R3 gemeten en gerepareerd.';

alter table intel.uitspraken
  add column if not exists bewijskracht_plafond smallint;

alter table intel.uitspraken
  drop constraint if exists uitspraken_bewijskracht_plafond;
alter table intel.uitspraken
  add constraint uitspraken_bewijskracht_plafond check (
    bewijskracht_plafond is null
    or (bewijskracht_plafond between 1 and 5));

comment on column intel.uitspraken.bewijskracht_plafond is
  'Het plafond dat de combinatie documentsoort x gezag aan bewijs_kwaliteit stelde, uit '
  'bewijskrachtPlafond() in src/pijplijn/documentsoort.ts. Een PLAFOND en geen waarde: de '
  'betrouwbaarheid van de bron blijft gelden en kan alleen verlaagd worden. Hiermee is per '
  'claim na te rekenen waarom zijn bewijskracht is wat hij is.';

alter table intel.uitspraken
  add column if not exists primaire_bron_bevestigd boolean not null default false;

comment on column intel.uitspraken.primaire_bron_bevestigd is
  'Is het oorspronkelijke besluit ook gezien bij het gezag dat het nam? Alleen van betekenis '
  'als het document SECUNDAIRE_BERICHTGEVING is en beschrijft_besluit_van gevuld. False is de '
  'veilige stand: zonder terugvinden blijft de bewijskracht beperkt, ook als de navertelling '
  'van een betrouwbare partij komt.';

-- Voor de redactielijst: welke claims vragen nog controle.
create index if not exists uitspraken_modaliteit_idx
  on intel.uitspraken (organisatie_id, modaliteit, modaliteit_zekerheid desc)
  where modaliteit is not null;
