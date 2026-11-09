-- ============================================================
-- 0060 — een bounce is een eigen toestand
-- ------------------------------------------------------------
-- WAAROM DEZE KOLOM ER MOET KOMEN, en waarom geen bestaande volstond.
--
-- intel.meld_berichten draagt sinds 0039 vier tijdstempels die vier
-- verschillende dingen betekenen: aangeboden, geaccepteerd, afgeleverd,
-- gelezen. Gemeten op 9 november 2026 in productie: 54 berichten, 54
-- geaccepteerd, 0 opgegeven, en afgeleverd_op leeg bij alle 54. Een
-- BOUNCE — het adres bestaat niet, de postbus zit vol, de ontvangende
-- server weigert structureel — was daarmee onzichtbaar: zo'n bericht
-- leest in het dashboard als 'geaccepteerd' en dus als geslaagd.
--
-- `opgegeven_op` LEEK de plek, maar is het niet, en de constraint uit
-- 0040 zegt dat zelf:
--
--     not (opgegeven_op is not null and geaccepteerd_op is not null)
--
-- Opgeven betekent daar "wij zijn gestopt met VERZENDEN", en een bericht
-- dat de provider heeft aangenomen is verzonden. Een bounce is iets
-- anders: wij hebben het goed verzonden, de provider heeft het
-- aangenomen, en de ONTVANGENDE kant heeft het geweigerd. Die twee in
-- één kolom proppen zou de betekenis van beide bederven — en de
-- constraint zou het terecht weigeren.
--
-- WAT DEZE MIGRATIE DOET
--   één kolom, nullable, geen backfill (null = niet geweigerd, wat voor
--   alle 54 bestaande rijen de waarheid is), geen nieuwe grant (0039
--   geeft vibe_intel_app al update op deze tabel), en één constraint die
--   de betekenis vastlegt.
--
-- DE CONSTRAINT, met per regel waarom
--   · geweigerd vraagt geaccepteerd: een bericht dat de provider nooit
--     heeft aangenomen kan door de ontvanger niet zijn geweigerd;
--   · geweigerd en afgeleverd sluiten elkaar uit: het is of aangekomen
--     of geweigerd, nooit beide. Zonder deze regel zou een 'bounced' na
--     een 'delivered' een rij opleveren die twee dingen tegelijk zegt.
--
-- `not valid` zoals de rest van dit schema: de bestaande rijen hebben
-- geweigerd_op null en halen de check per definitie, en een validatie
-- over de hele tabel hoort niet in een deployvenster.
-- ============================================================

alter table intel.meld_berichten
  add column if not exists geweigerd_op timestamptz;

comment on column intel.meld_berichten.geweigerd_op is
  'Wanneer de ONTVANGENDE kant het bericht hard heeft geweigerd (bounce). Iets anders dan '
  'opgegeven_op, dat betekent dat WIJ met verzenden zijn gestopt; een geaccepteerd bericht kan '
  'nooit opgegeven zijn (0040) maar wel geweigerd. Blijft leeg zolang er geen leesrecht op de '
  'provider-API is: dan is de bezorging NIET GEMETEN en dat is iets anders dan niet afgeleverd.';

alter table intel.meld_berichten
  drop constraint if exists meldberichten_weigering_klopt;

alter table intel.meld_berichten
  add constraint meldberichten_weigering_klopt check (
    (geweigerd_op is null or geaccepteerd_op is not null)
    and not (geweigerd_op is not null and afgeleverd_op is not null)
  ) not valid;

-- De berichten waarvan de bezorging nog onbekend is. Dit is de
-- werkvoorraad van werkBezorgstandenBij() en hij staat hier zodat die
-- vraag geen tabelscan wordt zodra er duizenden berichten staan.
create index if not exists meldberichten_bezorging_onbekend
  on intel.meld_berichten (organisatie_id, id desc)
  where provider_id is not null
    and geaccepteerd_op is not null
    and afgeleverd_op is null
    and geweigerd_op is null;
