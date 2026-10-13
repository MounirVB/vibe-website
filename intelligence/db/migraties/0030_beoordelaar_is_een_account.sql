-- ============================================================
-- 0030 — de beoordelaar is een account, niet een naam
-- ------------------------------------------------------------
-- 0029 legde het auditspoor aan met `door text`. Dat is te weinig:
-- intel.inhoud_voorstellen.beoordeeld_door is een bigint met een
-- foreign key naar intel.gebruikers, en dat is met opzet zo. Wie
-- redactionele inhoud goedkeurt moet een bestaand, ingelogd account
-- zijn; een vrije tekst kan door iedereen worden ingevuld en bewijst
-- dus niets.
--
-- Het auditspoor krijgt daarom BEIDE:
--
--   door_gebruiker_id  de verwijzing naar het account. Dit is het
--                      bewijs dat er een echt, geauthenticeerd persoon
--                      achter het besluit zat.
--   door               het e-mailadres zoals het TOEN was. Dit is geen
--                      duplicaat: een account kan later een ander adres
--                      krijgen of worden verwijderd, en dan hoort het
--                      auditspoor nog steeds te vertellen wie er in
--                      dat moment heeft goedgekeurd. Een auditspoor dat
--                      met een rename meebeweegt is geen auditspoor.
-- ============================================================

alter table intel.voorstel_beoordelingen
  add column if not exists door_gebruiker_id bigint references intel.gebruikers(id) on delete restrict;

-- Geen besluit zonder account. `not valid` is hier NIET nodig: de tabel
-- is in 0029 aangelegd en nog leeg in elke omgeving waar deze migratie
-- loopt, dus de constraint kan direct gelden.
alter table intel.voorstel_beoordelingen drop constraint if exists beoordeling_heeft_account;
alter table intel.voorstel_beoordelingen add constraint beoordeling_heeft_account check (
  door_gebruiker_id is not null);

create index if not exists voorstel_beoordelingen_door_idx
  on intel.voorstel_beoordelingen (organisatie_id, door_gebruiker_id, op desc);

comment on column intel.voorstel_beoordelingen.door_gebruiker_id is
  'Het account dat besloot. Verplicht: redactionele inhoud wordt niet goedgekeurd door een vrije tekst.';
comment on column intel.voorstel_beoordelingen.door is
  'Het e-mailadres op het moment van het besluit. Bewust een momentopname, zodat het spoor niet meebeweegt met een latere rename.';
