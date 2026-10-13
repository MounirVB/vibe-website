-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0027 tijdgrens op de uitspraak
-- ------------------------------------------------------------
-- WAAROM:       Par. 8 noemt dit geval met naam en toenaam.
--
--               Onacceptabel: "De netbeheerders investeren EUR 200 miljard."
--               Acceptabel:   "... investeren TOT 2040 meer dan EUR 200
--                              miljard in het elektriciteitsnet."
--
--               0024 had `periode` voor de herhaling ('per jaar') maar
--               geen veld voor de TIJDGRENS ('tot 2040', 'vanaf 2026',
--               '2027-2030'). Die twee zijn verschillende feiten: een
--               bedrag per jaar is iets anders dan een bedrag tot een
--               jaartal, en wie er één veld van maakt verliest de ander.
--
--               Gemeten: uitspraak 48 in productie had periode NULL bij
--               de bronzin "Tot 2040 investeren de netbeheerders meer dan
--               EUR 200 miljard", omdat de horizon buiten het venster van
--               de parser viel. De zin die eruit kwam miste zijn horizon.
--
-- WAT DIT DOET: additief, één kolom plus een soortspecifieke constraint:
--               een tijdgebonden fenomeen mag niet VERWOORDBAAR zijn
--               zonder periode of horizon.
--
-- TERUGDRAAIEN: alter table intel.uitspraken drop column horizon;
-- ============================================================

begin;

alter table intel.uitspraken
  add column if not exists horizon text;

comment on column intel.uitspraken.horizon is
  'De tijdgrens van de uitspraak: ''tot 2040'', ''vanaf 2026'', ''2027-2030''. Apart van '
  '`periode`, dat de herhaling draagt (''per jaar''). Een investeringsbedrag zonder horizon '
  'leest als een jaarbedrag of als een voltooide investering, en dat is een andere bewering.';

-- EEN TIJDGEBONDEN GROOTHEID ZONDER TIJD IS GEEN BEWERING.
-- Dit is de databasegrendel onder de poortcontrole: een investering, een
-- budget, een subsidiebedrag of een opdrachtwaarde mag niet verwoordbaar
-- heten zonder periode of horizon.
--
-- WAAROM NOT VALID — gemeten, niet gekozen uit voorzichtigheid.
--
-- Deze migratie draaide eerst ZONDER not valid. Lokaal ging dat door,
-- want die database had geen rij die hem schond. Op productie brak de
-- loper af en bleef de hele release half uitgerold staan:
--
--   migratie 0027_tijdgrens.sql mislukt: check constraint
--   "uitspraken_tijdgebonden_vraagt_tijd" of relation "uitspraken"
--   is violated by some row
--
-- `horizon` wordt HIERBOVEN aangemaakt en is dus null voor élke bestaande
-- rij. De grendel reduceert daarmee voor historische data tot "periode is
-- not null", en elke al VERWOORDBAAR verklaarde rij met een van de vier
-- fenomenen en periode NULL kelderde de migratie. Dat is precies de data
-- die 0027 bestaat om te vinden — hem gebruiken om de migratie te laten
-- falen maakt de vondst onbruikbaar.
--
-- NOT VALID bindt daarom alle nieuwe en bijgewerkte rijen, en laat de
-- historische rijen staan als een zichtbaar openstaand gegeven. Zodra ze
-- zijn verwoord of herbeoordeeld, sluit je de grendel alsnog met:
--
--   alter table intel.uitspraken validate constraint
--     uitspraken_tijdgebonden_vraagt_tijd;
--
-- De poortcontrole in de code (verwoordbaarheid, semantiek.ts) weigert
-- zo'n uitspraak hoe dan ook te verwoorden. Deze constraint is de tweede
-- grendel, niet de enige.
alter table intel.uitspraken drop constraint if exists uitspraken_tijdgebonden_vraagt_tijd;
alter table intel.uitspraken add constraint uitspraken_tijdgebonden_vraagt_tijd check (
  verwoordbaar is distinct from 'VERWOORDBAAR'
  or fenomeen is null
  or fenomeen not in ('netinvestering', 'subsidiebudget', 'subsidiebedrag', 'opdrachtwaarde')
  or periode is not null
  or horizon is not null) not valid;

-- Hoeveel rijen staan er buiten de grendel? Zonder dit getal is de
-- openstaande schuld onzichtbaar, en op productie is de database niet van
-- buiten te bevragen. Het antwoord landt dus in het deploylog.
do $$
declare aantal bigint;
begin
  select count(*) into aantal
    from intel.uitspraken
   where verwoordbaar = 'VERWOORDBAAR'
     and fenomeen in ('netinvestering', 'subsidiebudget', 'subsidiebedrag', 'opdrachtwaarde')
     and periode is null
     and horizon is null;
  raise notice '0027 tijdgrens: % bestaande uitspraak(en) buiten de grendel (not valid)', aantal;
end $$;

commit;
