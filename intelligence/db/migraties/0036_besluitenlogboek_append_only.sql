-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0036 het besluitenlogboek is append-only
-- ------------------------------------------------------------
-- WAAROM:       Gevonden door scenario 19 van de adversariële suite
--               (par. 32, "Missing audit record") op 13 oktober 2026.
--
--               `intel.audit_gebeurtenissen` is sinds 0001 append-only:
--               een trigger weigert elke UPDATE en DELETE. Het
--               REDACTIONELE besluitenlogboek,
--               `intel.voorstel_beoordelingen`, had die grendel niet.
--               Een DELETE erop liep gewoon door.
--
--               Dat is de tabel die vastlegt WIE wat heeft goedgekeurd,
--               op welke inhoudshash en op welke websiteversie. Precies
--               het spoor dat par. 14 en 18 onvernietigbaar willen
--               hebben, want zonder dat spoor is een goedkeuring niet
--               na te trekken.
--
--               De toets faalde met "Missing expected rejection": de
--               verwijdering slaagde. Dat is geen theoretisch risico
--               maar een gemeten uitkomst.
--
-- WAT DIT DOET: dezelfde grendel als 0001, op dezelfde manier, op
--               `intel.voorstel_beoordelingen`.
--
-- WAAROM DIT VEILIG IS: gemeten op de volledige broncode staat er één
--               `insert into intel.voorstel_beoordelingen` en twee
--               `from`-queries tegenover NUL updates en NUL deletes.
--               De applicatie doet dus al wat deze trigger voortaan
--               afdwingt; er verandert niets aan het gedrag, alleen aan
--               wat er NIET meer kan.
--
-- WAT DIT NIET DOET: het beschermt niet tegen iemand die de trigger
--               zelf dropt. Wie schema-eigenaar is, kan dat altijd.
--               Deze grendel sluit de ONGELUKKEN en de
--               applicatiepaden af, niet de eigenaar. Dat is hetzelfde
--               bereik als 0001 en het hoort zo te worden gelezen.
--
-- TERUGDRAAIEN: drop trigger beoordeling_geen_wijziging
--                 on intel.voorstel_beoordelingen;
-- ============================================================

create or replace function intel_priv.beoordeling_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception
    'intel.voorstel_beoordelingen is append-only (poging tot %). Een redactioneel besluit '
    'wordt niet gewijzigd of verwijderd; een nieuw besluit is een nieuwe rij.', tg_op;
end $$;

revoke all on function intel_priv.beoordeling_is_append_only() from public;

drop trigger if exists beoordeling_geen_wijziging on intel.voorstel_beoordelingen;
create trigger beoordeling_geen_wijziging
  before update or delete on intel.voorstel_beoordelingen
  for each statement execute function intel_priv.beoordeling_is_append_only();

comment on trigger beoordeling_geen_wijziging on intel.voorstel_beoordelingen is
  'Append-only, zoals audit_geen_wijziging op intel.audit_gebeurtenissen sinds 0001. Toegevoegd '
  'in 0036 nadat scenario 19 van de adversariele suite aantoonde dat een DELETE op het '
  'redactionele besluitenlogboek gewoon doorliep. Dit is het spoor van WIE wat heeft goedgekeurd, '
  'op welke inhoudshash en op welke websiteversie.';
