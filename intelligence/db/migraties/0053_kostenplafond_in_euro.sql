-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0053 een kostenplafond in euro's
-- ------------------------------------------------------------
-- WAAROM:       intel.kostenplafonds begrenst sinds 0007 het AANTAL
--               aanroepen (200 per dag) en het aantal TOKENS (400.000
--               uit per dag). Dat zijn nuttige grenzen, maar het zijn
--               geen geldgrenzen: wat 200 aanroepen kosten hangt af van
--               het model, en dat verandert.
--
--               De opdracht is een plafond in euro's: maximaal €5 per
--               dag en €0,25 per gegenereerd artikel, fail-closed bij
--               het bereiken van een grens. Die velden bestonden niet.
--
-- ------------------------------------------------------------
-- DE VAL DIE DEZE MIGRATIE MOET VOORKOMEN
--
-- intel.ai_prijzen is bij installatie LEEG, en dat is opzet: het
-- commentaar op die tabel zegt "zonder rij hier blijft kosten_schatting
-- ONBEKEND; een verzonnen tarief is erger dan geen tarief". Gevolg:
-- intel.ai_aanroepen.kosten_schatting staat op NULL en kosten_bron op
-- 'onbekend'.
--
-- Een eurogrens die over NULL-kosten optelt, telt dus op tot NUL — en
-- laat ONBEPERKT uitgeven door terwijl hij meldt dat er €0,00 is
-- besteed. Dat is dezelfde fout als een ontbrekende meting voor een nul
-- aanzien, nu met geld eraan.
--
-- DAAROM: zonder gemeten tarief voor het model dat je wil aanroepen,
-- WEIGERT de budgetcontrole. Niet omdat het te duur is, maar omdat de
-- grens niet te handhaven is. Een budget dat je niet kunt meten is geen
-- budget. De weigering noemt de tabel en het model, zodat duidelijk is
-- welke rij er moet komen en waar het tarief vandaan moet komen
-- (ai_prijzen.bron_url en .gemeten_op zijn beide verplicht).
--
-- ------------------------------------------------------------
-- WAT DE BESTAANDE GRENZEN BLIJVEN DOEN
--
-- max_ai_aanroepen_per_dag en max_tokens_uit_per_dag blijven staan en
-- blijven gelden. Ze zijn een tweede net: ze werken ook als een tarief
-- verkeerd is ingevoerd, en een aanroepenplafond vangt een
-- doorgeschoten lus eerder dan een geldplafond dat per aanroep een
-- fractie oploopt.
--
-- ------------------------------------------------------------
-- IDEMPOTENT:   JA. add column if not exists.
-- DESTRUCTIEF:  NEE. Twee nieuwe kolommen met een default; geen rij
--               wordt gewijzigd en geen bestaande grens verdwijnt.
-- ROLLBACK:     alter table intel.kostenplafonds
--                 drop column if exists max_kosten_per_dag,
--                 drop column if exists max_kosten_per_artikel,
--                 drop column if exists kosten_valuta;
-- ============================================================

set local lock_timeout = '5s';

alter table intel.kostenplafonds
  add column if not exists max_kosten_per_dag      numeric(10,4) not null default 5.0000,
  add column if not exists max_kosten_per_artikel  numeric(10,4) not null default 0.2500,
  add column if not exists kosten_valuta           text          not null default 'EUR';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'kostenplafonds_kosten_niet_negatief'
                    and conrelid = 'intel.kostenplafonds'::regclass) then
    alter table intel.kostenplafonds add constraint kostenplafonds_kosten_niet_negatief
      check (max_kosten_per_dag >= 0 and max_kosten_per_artikel >= 0);
  end if;

  /* HET ARTIKELPLAFOND MAG HET DAGPLAFOND NIET OVERSTIJGEN. Anders is
     de ene grens een leugen tegenover de andere: één artikel zou dan
     meer mogen kosten dan een hele dag. */
  if not exists (select 1 from pg_constraint
                  where conname = 'kostenplafonds_artikel_binnen_dag'
                    and conrelid = 'intel.kostenplafonds'::regclass) then
    alter table intel.kostenplafonds add constraint kostenplafonds_artikel_binnen_dag
      check (max_kosten_per_artikel <= max_kosten_per_dag);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'kostenplafonds_valuta_bekend'
                    and conrelid = 'intel.kostenplafonds'::regclass) then
    alter table intel.kostenplafonds add constraint kostenplafonds_valuta_bekend
      check (kosten_valuta in ('EUR', 'USD'));
  end if;
end $$;

comment on column intel.kostenplafonds.max_kosten_per_dag is
  'Geldgrens per dag, in kosten_valuta. Handhaafbaar ALLEEN als intel.ai_prijzen een tarief draagt voor het model: zonder tarief is kosten_schatting NULL en zou een som over NULL op nul uitkomen terwijl er onbeperkt wordt uitgegeven. De budgetcontrole weigert daarom bij een onbekend tarief.';

comment on column intel.kostenplafonds.max_kosten_per_artikel is
  'Geldgrens voor één gegenereerd artikel, in kosten_valuta. Wordt vóór de aanroep geschat uit het tarief en het maximum aan uitvoertokens; een schatting die erover gaat is een weigering.';

comment on column intel.kostenplafonds.kosten_valuta is
  'De valuta waarin de twee plafonds staan. Moet gelijk zijn aan intel.ai_prijzen.valuta voor het model, anders vergelijkt de controle appels met peren en weigert hij.';
