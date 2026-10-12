-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0023 verwoordbaarheid en NEEDS_RESEARCH
-- ------------------------------------------------------------
-- WAAROM:       Release 3.0.1 voegde een VIJFDE controle toe en een
--               nieuw eindoordeel. De checkconstraints uit 0021 kenden
--               die niet en weigerden de rij — terecht, en precies zoals
--               bedoeld: liever een harde weigering dan een onbekende
--               waarde die stil in de tabel glijdt.
--
-- DE VIJFDE CONTROLE: `verwoordbaarheid`
--
--               Kan dit feit op een pagina worden gezet zonder te
--               citeren en zonder een kaal getal te beweren?
--
--               De aanleiding is gemeten. De voorstellaag schreef voor
--               kandidaat 19 deze zin:
--
--                 "Per 2026-04-03 meldt Netbeheer Nederland: 8%, 60%."
--
--               8% van wat? De bronzin weet het — "Ook voor bedrijven
--               aangesloten bij TenneT geldt een stijging van 20%" —
--               maar de bewaarde uitspraak draagt alleen soort, eenheid
--               en onderwerp. En die bronzin mag niet mee: de bron
--               netbeheer-nederland-nieuws heeft mag_citeren = false en
--               citaat_limiet_tekens = 0.
--
--               Van de harde uitspraken achter de UPDATE_EXISTING-
--               kandidaten is 18x soort 'cijfer' met eenheid '%' en 4x
--               'cijfer' met 'MW'. Voor die 22 is er geen eigen veld dat
--               zegt waar het getal over gaat.
--
-- HET NIEUWE EINDOORDEEL: `NEEDS_RESEARCH`
--
--               Par. 13 van de opdracht schrijft dit expliciet voor:
--               liever NEEDS_RESEARCH dan een gefabriceerde alinea. Een
--               voorstel dat een getal bewijst maar niet kan zeggen wat
--               het meet, is geen voorstel maar een onderzoeksvraag.
--
-- WAT DIT DOET: additief. Twee checkconstraints worden VERRUIMD met een
--               nieuwe toegestane waarde; geen bestaande waarde wordt
--               ongeldig en geen rij wordt aangeraakt. De grendel dat
--               alleen KLAAR_VOOR_REVIEW goedgekeurd mag worden blijft
--               ongemoeid — NEEDS_RESEARCH is dus niet goedkeurbaar.
--
-- TERUGDRAAIEN: de constraints terugzetten op hun 0021-vorm. Dat kan
--               alleen nadat rijen met de nieuwe waarden zijn verwijderd,
--               en die dragen menselijke beoordelingen; doe het dus niet
--               zonder te kijken.
-- ============================================================

begin;

-- De vijfde controle mag bestaan.
alter table intel.inhoud_voorstel_controles
  drop constraint if exists inhoud_voorstel_controles_naam_check;
alter table intel.inhoud_voorstel_controles
  add constraint inhoud_voorstel_controles_naam_check check (naam in (
    'bronverwijzing', 'actualiteit', 'duplicatie', 'seo', 'verwoordbaarheid'));

-- Het nieuwe eindoordeel mag bestaan.
alter table intel.inhoud_voorstellen
  drop constraint if exists inhoud_voorstellen_eindoordeel_check;
alter table intel.inhoud_voorstellen
  add constraint inhoud_voorstellen_eindoordeel_check check (eindoordeel in (
    'KLAAR_VOOR_REVIEW', 'NEEDS_RESEARCH', 'HERROUTEREN', 'UITSTELLEN', 'AFWIJZEN'));

-- De wijzigingssoort 'interne_link': een voorstel hoeft geen alinea te
-- zijn. Een link naar een pagina die hetzelfde onderwerp dekt en nog
-- niet genoemd wordt, is volledig onderbouwd uit de sitekennis en
-- beweert geen enkel getal. Dat is het enige voorsteltype dat zonder
-- citeren en zonder kaal getal overblijft.
alter table intel.inhoud_voorstellen
  drop constraint if exists inhoud_voorstellen_wijziging_soort_check;
alter table intel.inhoud_voorstellen
  add constraint inhoud_voorstellen_wijziging_soort_check check (wijziging_soort in (
    'alinea_toevoegen', 'sectie_toevoegen', 'interne_link', 'geen'));

comment on constraint inhoud_voorstel_controles_naam_check on intel.inhoud_voorstel_controles is
  'Vijf controles. ''verwoordbaarheid'' kwam er in Release 3.0.1 bij en hield de laatste '
  'zelfbedachte zin tegen: een percentage waarvan alleen de niet-citeerbare bronzin zegt '
  'waar het over gaat, mag geen alinea worden.';

commit;
