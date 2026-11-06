-- ============================================================
-- 0057 — een handmatige publicatiehandeling heeft een naam
-- ------------------------------------------------------------
-- HET GEMETEN GAT, 6 november 2026.
--
-- intel.publicatiebesluiten draagt sinds 0004 drie kolommen over
-- herkomst: actor_soort, door_gebruiker_id en door_rol. De
-- goedkeuringskant vulde actor_soort 'mens' MET een gebruikers-id. De
-- publicatiekant — publiceer(), draaiTerug() en maakPublicatiePr() —
-- schreef altijd 'systeem' ZONDER id, ook wanneer een mens de keten met
-- de hand draaide. Gemeten op productie-SHA 826774c0: elke
-- publicatiezijdige regel stond op 'systeem'.
--
-- Gevolg: in het logboek was een handmatige publicatie niet te
-- onderscheiden van een automatische ronde. Precies de vraag die een
-- auditspoor hoort te beantwoorden.
--
-- De code is in dezelfde ronde gerepareerd (inhoud/actor.ts leidt de
-- drie kolommen af uit een geverifieerde actor). Deze migratie maakt die
-- belofte STRUCTUREEL in plaats van afhankelijk van de aanroeper: wie
-- 'mens' schrijft, schrijft ook een id.
--
-- WAAROM EEN CONSTRAINT EN NIET ALLEEN CODE
-- De tabel is append-only en wordt als bewijs gebruikt. Een regel die
-- 'mens' zegt zonder te zeggen WELKE mens is geen bewijs maar ruis, en
-- dat hoort de database te weigeren — ook tegen een toekomstige
-- aanroeper die inhoud/actor.ts omzeilt.
--
-- WAT DIT NIET DOET
-- Geen kolom erbij, geen kolom weg, geen bestaande waarde ongeldig. De
-- twee bestaande rijen in productie staan op actor_soort 'systeem' en
-- halen de constraint dus zonder aanpassing. 'ai' en 'cron' blijven
-- toegestaan zonder id: dat zijn geen mensen.
--
-- EEN BEWUST NEVENEFFECT. door_gebruiker_id is ON DELETE SET NULL. Met
-- deze constraint kan een gebruiker met publicatiehistorie niet meer
-- worden verwijderd zonder die regels eerst te behandelen — de delete
-- faalt in plaats van het spoor te wissen. Dat is hier de gewenste
-- kant: een auditspoor dat je kunt leegmaken door een account te
-- verwijderen, is geen auditspoor. Er is in de hele codebase geen pad
-- dat gebruikers verwijdert: een grep op 'delete from intel.gebruikers'
-- over src/, db/ en test/ geeft precies één treffer, en dat is deze
-- regel zelf.
-- ============================================================

alter table intel.publicatiebesluiten
  drop constraint if exists publicatiebesluiten_mens_heeft_account;

alter table intel.publicatiebesluiten
  add constraint publicatiebesluiten_mens_heeft_account
  check (actor_soort <> 'mens' or door_gebruiker_id is not null);

comment on constraint publicatiebesluiten_mens_heeft_account
  on intel.publicatiebesluiten is
  'Een handmatige publicatiehandeling wordt nooit zonder identiteit vastgelegd. Zie 0057 en inhoud/actor.ts.';
