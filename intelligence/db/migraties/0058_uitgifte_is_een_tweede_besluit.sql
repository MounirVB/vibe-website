-- ============================================================
-- 0058 — uitgifte naar de publieke site is een TWEEDE besluit
-- ------------------------------------------------------------
-- WAT ER VANDAAG MIS KAN GAAN, GEMETEN 9 november 2026.
--
-- intel.publicatiebeleid draagt sinds 0004 één schakelaar voor de hele
-- autonome weg: auto_publiceren_aan. Die schakelaar betekende tot nu toe
-- precies één ding, want de keten STOPTE erachter: automatisch
-- goedkeuren en een registerrecord schrijven. Een merge naar main en
-- daarmee een productiedeploy van vibeenergy.nl zat er niet in, want
-- niets in dit platform kon dat.
--
-- Met de autonome uitgifte erbij zou diezelfde ene schakelaar ineens
-- twee dingen aanzetten die niet dezelfde zwaarte hebben:
--
--   1 het platform keurt zelf een laagrisico-artikel goed      (database)
--   2 het platform merget zelf naar main en zet het publiek    (productie)
--
-- Stap 1 is terug te draaien met een update. Stap 2 is een
-- productiedeploy van een publieke website: terugdraaien betekent een
-- tweede merge, een tweede deploy en een URL die intussen door Google
-- gezien kan zijn. Eén vlag voor beide zou betekenen dat wie het
-- autonoom goedkeuren wil proberen, tegelijk het autonoom publiceren
-- aanzet. Dat is geen keuze maar een bijwerking.
--
-- auto_uitgifte_aan is daarom een eigen besluit, en net als zijn
-- voorganger STAAT HIJ UIT. De gezaaide productierij krijgt hem op
-- false; er is geen pad in de code dat hem zelf aanzet.
--
-- DE AFHANKELIJKHEID STAAT IN DE DATABASE, niet in de aanroeper.
-- Uitgifte zonder automatische goedkeuring is zinloos (er zou nooit een
-- door beleid goedgekeurd artikel zijn) en gevaarlijk (het zou een
-- MENSELIJK goedgekeurd artikel zonder tweede mens naar productie
-- duwen). De CHECK weigert die stand dus, in plaats van hem in
-- uitgifte/opdracht.ts op te vangen.
--
-- HOOG RISICO BLIJFT OP DRIE NIVEAUS DICHT. Deze migratie verandert daar
-- niets aan en voegt er een vierde niveau aan toe dat niets kost:
-- publicatiebeleid_hoog_risico_nooit_automatisch (0004) geldt
-- onverminderd, en omdat uitgifte auto_publiceren_aan vereist, kan er
-- langs deze weg geen hoogrisico-artikel bestaan om uit te geven.
--
-- ------------------------------------------------------------
-- DE TWEEDE HELFT: HET AUDITSPOOR KRIJGT DE GRENDEL VAN 0057
--
-- 0057 legde op intel.publicatiebesluiten vast dat 'mens' nooit zonder
-- gebruikers-id wordt geschreven. intel.audit_gebeurtenissen — de tabel
-- waarin je PER PERSOON kunt nagaan wat hij deed — kreeg die grendel
-- niet, en gemeten over db/migraties (0001, 0008, 0036 raken de tabel)
-- bestaat hij daar nergens. Een 'mens'-regel zonder actor_id is daar nog
-- steeds insertable, en dat is dezelfde fout op de tabel waar hij het
-- meest telt.
--
-- Gemeten op productie-SHA 56c7b0ab vóór deze migratie: 406 regels,
-- waarvan 9 met actor_soort 'mens' en alle 9 met een actor_id; 397
-- 'systeem' zonder id. Geen enkele bestaande regel wordt dus ongeldig.
-- 'systeem', 'ai' en 'cron' blijven zonder id toegestaan: dat zijn geen
-- mensen, en 0052 legt uit waarom er voor 'systeem' met opzet geen
-- gebruikersrij bestaat.
--
-- WAT DIT NIET DOET
-- Geen kolom weg, geen bestaande waarde ongeldig, geen tabel herschreven.
-- Eén kolom erbij met default false, en twee checks.
-- ============================================================

-- ------------------------------------------------------------
-- 1. De tweede schakelaar
-- ------------------------------------------------------------
alter table intel.publicatiebeleid
  add column if not exists auto_uitgifte_aan boolean not null default false;

comment on column intel.publicatiebeleid.auto_uitgifte_aan is
  'Mag het platform een door beleid goedgekeurd artikel ZELF naar main mergen en daarmee publiek zetten? Default uit. Vereist auto_publiceren_aan. Zie 0058 en uitgifte/opdracht.ts.';

alter table intel.publicatiebeleid
  drop constraint if exists publicatiebeleid_uitgifte_vereist_autogoedkeuring;

alter table intel.publicatiebeleid
  add constraint publicatiebeleid_uitgifte_vereist_autogoedkeuring
  check (not (auto_uitgifte_aan and not auto_publiceren_aan));

comment on constraint publicatiebeleid_uitgifte_vereist_autogoedkeuring
  on intel.publicatiebeleid is
  'Autonome uitgifte bestaat alleen boven op autonome goedkeuring; anders zou een menselijk goedgekeurd artikel zonder tweede mens naar productie gaan.';

-- ------------------------------------------------------------
-- 2. Het auditspoor krijgt dezelfde grendel als 0057
-- ------------------------------------------------------------
alter table intel.audit_gebeurtenissen
  drop constraint if exists audit_mens_heeft_account;

alter table intel.audit_gebeurtenissen
  add constraint audit_mens_heeft_account
  check (actor_soort <> 'mens' or actor_id is not null);

comment on constraint audit_mens_heeft_account
  on intel.audit_gebeurtenissen is
  'Een menselijke handeling wordt nooit zonder identiteit vastgelegd. De tegenhanger van publicatiebesluiten_mens_heeft_account uit 0057.';
