-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0054 claimvorm, datumrol en bronpassage
-- ------------------------------------------------------------
-- WAAROM:       intel.uitspraken kent negen soorten (feit, cijfer,
--               datum, regel, prijs, specificatie, status, berekening,
--               interpretatie), maar de extractie produceerde er maar
--               twee: cijfer/prijs uit zoekGetallen() en datum uit
--               zoekDatums(). Alle andere zeven soorten bestonden
--               uitsluitend als toegestane waarde.
--
--               Gemeten op 6 november 2026, na de volledige
--               herverwerking van 4.004 bronversies: 109 claims, alle
--               109 van soort cijfer, prijs of datum. Nul claims over
--               een besluit, een verplichting, een inwerkingtreding,
--               een subsidievenster, een congestiestatus, een
--               projectstatus, een specificatie of een
--               beleidswijziging — terwijl een steekproef van 135
--               versies (3.610 zinnen) uit datzelfde corpus voor elk
--               van die acht vormen treffers geeft: 92 zinnen over een
--               congestiestatus, 28 over een projectstatus, 14 over een
--               specificatie, 13 over een beleidswijziging, 10 over een
--               subsidievenster, 6 over een verplichting, 5 over een
--               besluit, 2 over een inwerkingtreding.
--
--               Een nieuwskanaal over netcongestie dat geen enkele
--               congestiestatus als claim kan opslaan, mist niet een
--               nuance maar zijn onderwerp.
--
-- ------------------------------------------------------------
-- WAT DEZE MIGRATIE WEL EN NIET DOET
--
-- WEL: drie kolommen bij intel.uitspraken, alle drie NULL-baar, met
-- CHECKs die uitsluitend over de NIEUWE waarden gaan. Bestaande rijen
-- houden NULL in alle drie en raken geen enkele nieuwe CHECK.
--
-- NIET: geen kolom verwijderd, geen type gewijzigd, geen bestaande
-- CHECK verruimd of verwijderd, geen rij aangeraakt. Er is dus geen
-- enkele bestaande publicatiebeveiliging die hierdoor zwakker wordt.
--
-- ------------------------------------------------------------
-- DE PASSAGE IS EEN HARDE EIS EN DAAROM EEN CONSTRAINT
--
-- De opdracht zegt: "Iedere claim moet een concrete bronpassage
-- hebben." Dat kan in code staan, maar code die de enige grendel is
-- gaat bij de volgende aanroeper stuk. Vandaar
-- uitspraken_vorm_vereist_passage: een claim MET een claimvorm ZONDER
-- passage van minstens tien tekens wordt door de database geweigerd.
--
-- Tien tekens en niet nul: een lege string en een punt zijn ook "een
-- waarde", en dan is de eis niets waard. De passage is het letterlijke
-- fragment uit de brontekst dat de vorm aanwijst — niet de hele zin
-- (die staat al in `tekst`) en niet onze samenvatting.
--
-- ------------------------------------------------------------
-- WAAROM `tijdstand` APART VAN `modaliteit` STAAT
--
-- modaliteit (0030) beantwoordt: wordt dit vastgesteld, voorgesteld of
-- verwacht. Dat is een vraag over de SPREKER.
--
-- tijdstand beantwoordt: geldt het nu, is het alleen aangekondigd, is
-- het verlopen, is het tijdelijk. Dat is een vraag over de TOESTAND.
--
-- De opdracht eist beide onderscheidingen náást elkaar:
--   "Aangekondigd ≠ in werking"      -> tijdstand
--   "Tijdelijke ≠ permanente situatie" -> tijdstand
--   "Voornemen ≠ vastgesteld besluit"  -> modaliteit
--   "Verwacht ≠ gerealiseerd"          -> modaliteit
--   "Kan ≠ zal"                        -> modaliteit
--
-- Eén veld voor beide zou ze door elkaar halen: een besluit kan
-- VASTGESTELD zijn (de spreker stelt het vast) én AANGEKONDIGD (het
-- geldt nog niet). Dat is geen tegenspraak maar precies de combinatie
-- die een lezer moet zien.
--
-- ------------------------------------------------------------
-- DE GRENDEL OP AANGEKONDIGD
--
-- uitspraken_aangekondigd_is_niet_in_werking: een claim die als
-- AANGEKONDIGD is vastgelegd mag geen geldig_vanaf in het verleden
-- hebben zónder dat de tijdstand op IN_WERKING staat. Anders zou
-- "de regel is aangekondigd per 1 januari 2026" na die datum stil als
-- geldend recht gelezen worden zonder dat iemand heeft nagemeten dat
-- hij ook in werking is getreden.
--
-- IDEMPOTENT:  add column if not exists + een genoemde constraint die
--              eerst wordt gedropt. Twee keer draaien geeft dezelfde
--              stand.
-- TERUGDRAAIEN: drop de drie kolommen; de vijf CHECKs verdwijnen
--              daarmee mee. Geen bestaande data raakt dat.
-- ============================================================

begin;

alter table intel.uitspraken
  add column if not exists claimvorm   text,
  add column if not exists tijdstand   text,
  add column if not exists bronpassage text;

comment on column intel.uitspraken.claimvorm is
  'De NIET-NUMERIEKE vorm van deze claim, als hij er een heeft: een besluit, '
  'een verplichting, een inwerkingtreding, een subsidievenster, een '
  'congestiestatus, een projectstatus, een specificatie of een '
  'beleidswijziging. NULL voor de numerieke en datumclaims, die hun vorm al '
  'in `soort` dragen.';

comment on column intel.uitspraken.tijdstand is
  'De TOESTAND van wat de claim beschrijft: IN_WERKING, AANGEKONDIGD, '
  'VERLOPEN, TIJDELIJK of ONBEPAALD. Staat los van `modaliteit`, die over de '
  'spreker gaat en niet over de toestand. Een besluit kan VASTGESTELD zijn en '
  'toch alleen AANGEKONDIGD.';

comment on column intel.uitspraken.bronpassage is
  'Het LETTERLIJKE fragment uit de brontekst dat deze vorm aanwijst. Niet de '
  'hele zin — die staat in `tekst` — en niet onze samenvatting. Verplicht '
  'zodra `claimvorm` of `datumrol` gevuld is; zie '
  'uitspraken_vorm_vereist_passage.';

-- ------------------------------------------------------------
-- DE ACHT VORMEN UIT DE OPDRACHT, EN GEEN NEGENDE
--
-- De lijst is gesloten. Een nieuwe vorm hoort een migratie te zijn en
-- geen vrije tekst in een kolom: zodra de extractie zelf mag bepalen
-- welke vormen bestaan, is er geen enkele manier meer om te meten of
-- een vorm volledig is gedekt.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_claimvorm;
alter table intel.uitspraken add constraint uitspraken_claimvorm check (
  claimvorm is null or claimvorm in (
    'BESLUIT',           -- feitelijke besluiten
    'VERPLICHTING',      -- nieuwe en gewijzigde verplichtingen
    'INWERKINGTREDING',  -- inwerkingtreding van regelgeving
    'SUBSIDIEVENSTER',   -- openstelling en sluiting van subsidies
    'CONGESTIESTATUS',   -- netcongestiestatussen
    'PROJECTSTATUS',     -- projectstatussen
    'SPECIFICATIE',      -- technische specificaties
    'BELEIDSWIJZIGING'   -- feitelijke wijzigingen in beleid of uitvoering
  )
);

alter table intel.uitspraken drop constraint if exists uitspraken_tijdstand;
alter table intel.uitspraken add constraint uitspraken_tijdstand check (
  tijdstand is null or tijdstand in (
    'IN_WERKING', 'AANGEKONDIGD', 'VERLOPEN', 'TIJDELIJK', 'ONBEPAALD'
  )
);

-- ------------------------------------------------------------
-- DE ZES DATUMROLLEN UIT DE OPDRACHT
--
-- LOSSE_DATUM staat er expliciet bij, en dat is het punt: een datum
-- zonder voldoende context is een GEMETEN uitkomst en geen ontbrekende
-- waarde. Wie hem als NULL zou laten, kan later niet onderscheiden
-- tussen "nog niet beoordeeld" en "beoordeeld en te mager".
-- ------------------------------------------------------------
alter table intel.uitspraken
  add column if not exists datumrol text;

comment on column intel.uitspraken.datumrol is
  'Welke rol de datum in deze claim speelt: AANVRAAGPERIODE, STARTDATUM, '
  'EINDDATUM, PUBLICATIEDATUM, VERWACHTE_DATUM of LOSSE_DATUM. LOSSE_DATUM is '
  'een uitkomst en geen leegte: de datum staat er wel, maar zonder genoeg '
  'context om er een bewering van te maken.';

alter table intel.uitspraken drop constraint if exists uitspraken_datumrol;
alter table intel.uitspraken add constraint uitspraken_datumrol check (
  datumrol is null or datumrol in (
    'AANVRAAGPERIODE', 'STARTDATUM', 'EINDDATUM',
    'PUBLICATIEDATUM', 'VERWACHTE_DATUM', 'LOSSE_DATUM'
  )
);

-- Een datumrol hoort alleen bij een datumclaim. Een percentage met een
-- EINDDATUM-rol is geen strengere claim maar een verkeerd gelabelde.
alter table intel.uitspraken drop constraint if exists uitspraken_datumrol_bij_datum;
alter table intel.uitspraken add constraint uitspraken_datumrol_bij_datum check (
  datumrol is null or soort = 'datum'
);

-- ------------------------------------------------------------
-- DE PASSAGE-EIS
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_vorm_vereist_passage;
alter table intel.uitspraken add constraint uitspraken_vorm_vereist_passage check (
  (claimvorm is null and datumrol is null)
  or (bronpassage is not null and length(bronpassage) >= 10)
);

-- ------------------------------------------------------------
-- EEN AANKONDIGING IS GEEN GELDEND RECHT
--
-- Zonder deze CHECK zou een claim met tijdstand AANGEKONDIGD en een
-- geldig_vanaf dat inmiddels verstreken is, door elke latere lezer als
-- geldend worden opgevat — precies het onderscheid "aangekondigd ≠ in
-- werking" dat de opdracht eist, stil weggevallen door tijdsverloop.
--
-- De eis is NIET dat de datum in de toekomst ligt (dat zou van de klok
-- afhangen en dus onreproduceerbaar zijn, zie 0030). De eis is dat een
-- AANGEKONDIGDE claim geen geldig_vanaf draagt: wie wil vastleggen dat
-- de regel ook echt geldt, zet de tijdstand op IN_WERKING en neemt
-- daarmee de bewijslast.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_aangekondigd_is_niet_in_werking;
alter table intel.uitspraken add constraint uitspraken_aangekondigd_is_niet_in_werking check (
  tijdstand is distinct from 'AANGEKONDIGD' or geldig_vanaf is null
);

-- ------------------------------------------------------------
-- EEN VORMCLAIM DIE VERWOORDBAAR IS, HEEFT ZIJN TIJDSTAND NODIG
--
-- uitspraken_verwoordbaar_heeft_zin eist al een zin van 25 tekens en
-- uitspraken_verwoordbaar_vraagt_gebied al een toepassingsgebied. Deze
-- derde eis komt erbij voor de vormclaims: een besluit of verplichting
-- die als VERWOORDBAAR naar de redactie gaat zonder dat is vastgelegd
-- of hij in werking is, laat de lezer de belangrijkste vraag zelf
-- raden.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_vorm_verwoordbaar_vraagt_tijdstand;
alter table intel.uitspraken add constraint uitspraken_vorm_verwoordbaar_vraagt_tijdstand check (
  claimvorm is null
  or verwoordbaar is distinct from 'VERWOORDBAAR'
  or tijdstand is not null
);

-- ------------------------------------------------------------
-- EEN LOSSE DATUM WORDT NOOIT VERWOORDBAAR
--
-- "Een losse datum is niet automatisch een verwoordbare claim" staat in
-- de opdracht. In de poortlaag staat die regel ook, maar een regel die
-- alleen in de poort staat verdwijnt zodra iemand een tweede schrijfweg
-- maakt. Hier kan de database hem niet vergeten.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_losse_datum_niet_verwoordbaar;
alter table intel.uitspraken add constraint uitspraken_losse_datum_niet_verwoordbaar check (
  datumrol is distinct from 'LOSSE_DATUM'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
);

create index if not exists uitspraken_claimvorm_idx
  on intel.uitspraken (organisatie_id, claimvorm)
  where claimvorm is not null;

create index if not exists uitspraken_datumrol_idx
  on intel.uitspraken (organisatie_id, datumrol)
  where datumrol is not null;

commit;
