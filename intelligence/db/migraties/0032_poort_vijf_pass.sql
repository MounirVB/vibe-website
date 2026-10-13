-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0032 READY_FOR_REVIEW betekent 5/5
-- ------------------------------------------------------------
-- WAAROM:       READY_FOR_REVIEW beloofde iets wat het niet waarmaakte.
--
--               weegAf gaf KLAAR_VOOR_REVIEW óók wanneer de controle
--               `verwoordbaarheid` had GEFAALD, zolang er een
--               interne-linkkans was. Zo'n voorstel is geen feitelijke
--               paginarevisie: het feit is juist niet te verwoorden. Het
--               belandde desondanks in dezelfde staat als een
--               gecontroleerde revisie, en de studio zette er een kop
--               boven die beloofde dat alle vijf de controles waren
--               gehaald.
--
--               Gemeten op 13 oktober 2026: voorstel 10 (kandidaat 19)
--               stond op READY_FOR_REVIEW met als eigen oordeelReden
--               "het feit zelf is niet te verwoorden zonder te citeren".
--               Van de twee rijen op READY_FOR_REVIEW was er dus één
--               een echte feitelijke revisie.
--
-- WAT DIT DOET: 1 laat het nieuwe eindoordeel KLAAR_VOOR_LINKREVIEW toe
--               2 laat de nieuwe staat READY_FOR_LINK_REVIEW toe
--               3 verruimt de goedkeurgrendel, zodat een linkvoorstel
--                 ook goedgekeurd KAN worden — zonder die regel zou de
--                 nieuwe staat een doodlopende weg zijn
--               4 verplaatst BESTAANDE rijen die onterecht op
--                 READY_FOR_REVIEW staan, deterministisch afgeleid uit
--                 de opgeslagen controlerijen
--               5 meldt een al GOEDGEKEURDE rij die de nieuwe poort niet
--                 haalt, zonder de goedkeuring te wijzigen
--
-- WAT DIT NIET DOET: geen rij verwijderen, geen beoordeling
--               overschrijven, geen hash aanraken, geen auditspoor
--               bijwerken. De hersteloperatie verandert alleen
--               `eindoordeel` en `publicatie_status`, en alleen voor
--               rijen die nog op een mens wachten.
--
-- TERUGDRAAIEN: alter table intel.inhoud_voorstellen
--                 drop constraint inhoud_voorstellen_eindoordeel_check;
--               ... en de oude vorm uit 0023/0029 terugzetten. De
--               verplaatste rijen zijn daarna niet automatisch terug;
--               ze staan dan op een waarde die de oude check verbiedt.
--               Terugdraaien vraagt dus eerst een omgekeerde update.
-- ============================================================

-- ---------------------------------------------------------------- 1
alter table intel.inhoud_voorstellen
  drop constraint if exists inhoud_voorstellen_eindoordeel_check;
alter table intel.inhoud_voorstellen
  add constraint inhoud_voorstellen_eindoordeel_check check (eindoordeel in (
    'KLAAR_VOOR_REVIEW', 'KLAAR_VOOR_LINKREVIEW', 'NEEDS_RESEARCH',
    'HERROUTEREN', 'UITSTELLEN', 'AFWIJZEN'));

-- ---------------------------------------------------------------- 2
alter table intel.inhoud_voorstellen
  drop constraint if exists voorstellen_publicatie_status_geldig;
alter table intel.inhoud_voorstellen
  add constraint voorstellen_publicatie_status_geldig check (
    publicatie_status in (
      'DRAFT',
      'READY_FOR_REVIEW',
      'READY_FOR_LINK_REVIEW',
      'APPROVED',
      'PUBLICATION_PRECHECK',
      'DEPLOYMENT',
      'LIVE_VERIFIED',
      'REJECTED'));

-- ---------------------------------------------------------------- 3
-- ZONDER DEZE REGEL IS DE NIEUWE STAAT EEN DOODLOPENDE WEG.
-- 0021 eist `beoordeling <> 'GOEDGEKEURD' or eindoordeel =
-- 'KLAAR_VOOR_REVIEW'`. Een goedgekeurd LINKvoorstel zou die grendel
-- schenden, en dan kan niemand het ooit goedkeuren. De grendel blijft
-- doen waarvoor hij bestaat — een AFGEWEZEN of te HERROUTEREN voorstel
-- kan nog steeds niet worden goedgekeurd — en laat nu beide
-- gereedheidsklassen door.
alter table intel.inhoud_voorstellen
  drop constraint if exists voorstel_alleen_review_goedkeuren;
alter table intel.inhoud_voorstellen
  add constraint voorstel_alleen_review_goedkeuren check (
    beoordeling <> 'GOEDGEKEURD'
    or eindoordeel in ('KLAAR_VOOR_REVIEW', 'KLAAR_VOOR_LINKREVIEW'));

comment on constraint voorstel_alleen_review_goedkeuren on intel.inhoud_voorstellen is
  'Zonder deze grendel kon een afgewezen voorstel alsnog worden goedgekeurd, en dan '
  'is de controlelaag decoratie. Sinds 0032 laat hij ook KLAAR_VOOR_LINKREVIEW door: '
  'een linkvoorstel is geen feitelijke revisie maar wel een besluit dat een mens neemt.';

-- ---------------------------------------------------------------- 4
-- DE HERSTELOPERATIE.
--
-- Deterministisch, uit de opgeslagen controlerijen en niet uit de
-- oordeelReden-tekst. Een rij hoort in READY_FOR_LINK_REVIEW wanneer:
--   · hij nu op READY_FOR_REVIEW staat (wacht dus nog op een mens), EN
--   · de controle `verwoordbaarheid` op FAIL staat.
--
-- Alleen die twee kolommen bewegen. beoordeling, beoordeeld_door,
-- beoordeeld_op, inhouds_hash en goedgekeurd_hash blijven ongemoeid;
-- een rij in deze staat heeft nog geen goedkeuring, dus er valt niets
-- te bewaren wat we zouden kunnen beschadigen.
update intel.inhoud_voorstellen v
   set eindoordeel = 'KLAAR_VOOR_LINKREVIEW',
       publicatie_status = 'READY_FOR_LINK_REVIEW',
       bijgewerkt_op = now()
 where v.publicatie_status = 'READY_FOR_REVIEW'
   and exists (
     select 1 from intel.inhoud_voorstel_controles ct
      where ct.voorstel_id = v.id
        and ct.organisatie_id = v.organisatie_id
        and ct.naam = 'verwoordbaarheid'
        and ct.oordeel = 'FAIL');

-- ---------------------------------------------------------------- 5
-- EEN AL GOEDGEKEURDE RIJ DIE DE NIEUWE POORT NIET HAALT.
--
-- Die wordt NIET gewijzigd: een goedkeuring is een menselijk besluit en
-- die overschrijven zou het auditspoor onwaar maken. Hij wordt gemeld,
-- zodat een mens hem opnieuw kan beoordelen voordat er iets wordt
-- gepubliceerd. Gemeten op 13 oktober 2026 waren er nul goedgekeurde
-- rijen, dus dit blok is een vangnet en geen verwachting.
insert into intel.systeem_meldingen (organisatie_id, soort, ernst, bericht, context)
select
  v.organisatie_id,
  'poort_na_goedkeuring',
  'waarschuwing',
  'voorstel ' || v.id || ' is goedgekeurd maar haalt de poort van 0032 niet ' ||
    '(verwoordbaarheid staat op FAIL). Publicatie hoort geblokkeerd te blijven ' ||
    'tot een bevoegde beoordelaar opnieuw heeft gekeken.',
  jsonb_build_object('voorstel_id', v.id, 'publicatie_status', v.publicatie_status)
  from intel.inhoud_voorstellen v
 where v.publicatie_status in ('APPROVED', 'PUBLICATION_PRECHECK', 'DEPLOYMENT', 'LIVE_VERIFIED')
   and exists (
     select 1 from intel.inhoud_voorstel_controles ct
      where ct.voorstel_id = v.id
        and ct.organisatie_id = v.organisatie_id
        and ct.naam = 'verwoordbaarheid'
        and ct.oordeel = 'FAIL');
