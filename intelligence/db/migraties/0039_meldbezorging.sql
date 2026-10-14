-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0039 bezorging van meldingen
-- ------------------------------------------------------------
-- WAAROM DEZE TWEE KOLOMMEN BESTAAN.
--
-- `intel.meldingen` droeg al `bezorgpogingen` en `laatste_bezorgfout`,
-- en daarmee kon `bezorgMeldingen()` tot vijf keer proberen. Wat er niet
-- in stond is WANNEER die poging was. Gevolg: de retry gebeurde elke
-- ronde opnieuw, dus bij een uurlijkse gezondheidstaak vijf keer in vijf
-- uur, en daarna nooit meer. Dat is geen back-off; dat is een teller die
-- leegloopt.
--
--   laatste_poging_op   het moment van de laatste bezorgPOGING,
--                       geslaagd of niet. Hiermee kan de wachttijd
--                       exponentieel groeien: 1, 4, 16, 64 minuten.
--
--   herstel_bezorgd_op  of er voor een GESLOTEN melding al een
--                       herstelbericht is verstuurd. Zonder deze kolom
--                       zou elke ronde opnieuw melden dat een storing
--                       voorbij is — precies de herhaling die de
--                       meldlaag juist moet voorkomen.
--
-- ADDITIEF EN ACHTERWAARTS COMPATIBEL. Twee nullable kolommen, geen
-- default die bestaande rijen herschrijft, geen constraint erbij. Code
-- van vóór deze migratie negeert ze; code erna leest NULL als "nog nooit
-- geprobeerd", en dat is precies de juiste betekenis voor de tien
-- meldingen die nu openstaan met bezorgpogingen = 0.
--
-- TERUGDRAAIEN: alter table intel.meldingen drop column laatste_poging_op,
-- drop column herstel_bezorgd_op. Dat is destructief voor de
-- bezorghistorie en daarom geen onderdeel van deze migratie.
-- ============================================================

alter table intel.meldingen
  add column if not exists laatste_poging_op  timestamptz,
  add column if not exists herstel_bezorgd_op timestamptz;

comment on column intel.meldingen.laatste_poging_op is
  'Moment van de laatste bezorgpoging, geslaagd of niet. Draagt de exponentiele back-off; NULL = nog nooit geprobeerd.';
comment on column intel.meldingen.herstel_bezorgd_op is
  'Moment waarop het herstelbericht voor deze gesloten melding is bezorgd. NULL = nog niet gemeld.';

-- De bezorgvraag luidt: welke open meldingen mogen NU opnieuw? Die
-- query filtert op gesloten_op is null, bezorgd_op is null en
-- laatste_poging_op. Een partiele index daarop blijft klein, want het
-- normale geval is nul rijen.
create index if not exists meldingen_te_bezorgen_idx
  on intel.meldingen (organisatie_id, laatste_poging_op nulls first)
  where gesloten_op is null and bezorgd_op is null;

-- En de herstelvraag: welke gesloten meldingen wachten nog op hun
-- herstelbericht? Ook hier is nul rijen het normale geval.
create index if not exists meldingen_herstel_idx
  on intel.meldingen (organisatie_id, gesloten_op)
  where gesloten_op is not null and herstel_bezorgd_op is null;
