-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0040 de bron achter een melding
-- ------------------------------------------------------------
-- WAAROM DEZE KOLOM BESTAAT, EN WAAROM DE EERSTE OPLOSSING FOUT WAS.
--
-- De eigenaar vroeg dat de drie RENDO-signalen herkenbaar zijn als EEN
-- onderliggend probleem. Gemeten op 14 oktober 2026 stonden deze drie
-- open, alle drie over dezelfde bron:
--
--   ingestie/brondekking                       "FAILED: rendo-nieuws"
--   ingestie/bronnen met opeenvolgende fouten  "1 van 20 ... rendo-nieuws"
--   ingestie/storingssoort TOEGANG_BEPERKT     "1 bron ... rendo-nieuws"
--
-- De eerste versie van de bundeling zocht bronsleutels in de MEETTEKST.
-- Dat werkt voor deze drie, en het is toch de verkeerde oplossing: alle
-- drie die teksten worden afgekapt op 160 tekens
-- (ops/brondekking.ts:208, ops/gezondheid.ts:384, :493). Een signaal
-- dat werkelijk over VIJF bronnen gaat kan er daardoor een tonen, en
-- dan zou de bundeling er "een onderliggend probleem" van maken.
-- Precies de verkeerde kant op falen: een mail die zegt dat twee
-- signalen dezelfde oorzaak hebben terwijl dat niet vaststaat.
--
-- De sleutel is dus GEEN tekstvondst maar een vastgelegd feit. De
-- gezondheidsmeting weet exact hoeveel bronnen er in het spel zijn en
-- zet `bron` alleen als dat er precies EEN is; die waarde komt hier
-- terecht en de bundeling leest hem.
--
-- ADDITIEF. Een nullable tekstkolom zonder default en zonder
-- constraint. Bestaande rijen blijven geldig en lezen als NULL, wat
-- precies de juiste betekenis heeft: "niet aan een enkele bron toe te
-- schrijven". De tien meldingen die nu openstaan houden dus NULL tot de
-- volgende gezondheidsronde ze bijwerkt.
--
-- TERUGDRAAIEN: alter table intel.meldingen drop column bron_sleutel.
-- Dat is destructief voor de bundelhistorie en daarom geen onderdeel
-- van deze migratie.
-- ============================================================

alter table intel.meldingen
  add column if not exists bron_sleutel text;

comment on column intel.meldingen.bron_sleutel is
  'De bronsleutel waar deze melding over gaat, als dat er precies EEN is. NULL = niet aan een enkele bron toe te schrijven. Draagt de bundeling in de alarmering.';

-- De bundelvraag luidt: welke open meldingen gaan over dezelfde bron?
create index if not exists meldingen_bron_idx
  on intel.meldingen (organisatie_id, bron_sleutel)
  where gesloten_op is null and bron_sleutel is not null;
