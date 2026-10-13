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
alter table intel.uitspraken drop constraint if exists uitspraken_tijdgebonden_vraagt_tijd;
alter table intel.uitspraken add constraint uitspraken_tijdgebonden_vraagt_tijd check (
  verwoordbaar is distinct from 'VERWOORDBAAR'
  or fenomeen is null
  or fenomeen not in ('netinvestering', 'subsidiebudget', 'subsidiebedrag', 'opdrachtwaarde')
  or periode is not null
  or horizon is not null);

commit;
