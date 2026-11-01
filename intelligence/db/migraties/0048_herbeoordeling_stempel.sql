-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0048 de herbeoordelingsstempel
-- ------------------------------------------------------------
-- WAAROM:       De herbeoordeling selecteerde op een VERSCHIL dat de
--               classificatie zelf uitwist.
--
--               De voorwaarde was (claimpoort.ts, WACHT_OP_HERBEOORDELING_SQL):
--
--                 u.modaliteit_versie is distinct from <MODALITEIT_VERSIE>
--                 or bv.documentsoort_versie is distinct from <DOCUMENTSOORT_VERSIE>
--
--               De tweede helft hangt aan het BRONDOCUMENT. De taak
--               `documentclassificatie` zet dat veld op de huidige
--               versie, en staat op prioriteit 21 — vóór `herbeoordeling`
--               op 22. In dezelfde ronde is de greep dus al weg voordat
--               de herbeoordeling kijkt.
--
--               GEMETEN IN PRODUCTIE op 1 november 2026, na de
--               v2-uitrol: 3753 van 3753 versies op documentsoort-v2,
--               `npm run herbeoordeel` zag 0 claims, en claim 29 bleef
--               staan op bewijs_kwaliteit 2 terwijl documentsoort v2 voor
--               ONTWERPBESLUIT bij BELANGENBEHARTIGER plafond 1 geeft.
--               Som bewijskracht 126 waar 125 juist is. De claim is
--               ongeverifieerd, dus er rustte geen bevestiging op — maar
--               het getal was onjuist, en bij een volgende versiewissel
--               zou hetzelfde opnieuw gebeuren.
--
-- WAT DIT DOET: zet de stempel op de CLAIM in plaats van op het
--               document. `herbeoordeeld_onder` bewaart onder welke
--               motorversies een uitspraak voor het laatst is gewogen.
--               De selectie wordt daarmee:
--
--                 u.herbeoordeeld_onder is distinct from <MOTORVERSIES>
--
--               Dat is onafhankelijk van de classificatie, en het is
--               precies het gedrag dat een versiewissel moet hebben:
--               verandert een motor, dan verandert de stempel, en dan is
--               elke bestaande claim per definitie nog niet gewogen.
--
-- GEEN DML, EN DAT IS HIER EEN KEUZE MET GEVOLG. De kolom begint overal
--               NULL, en NULL `is distinct from` elke string is TRUE.
--               Alle bestaande claims zijn dus na deze migratie
--               selecteerbaar, en de eerste herbeoordelingsronde weegt
--               ze allemaal opnieuw. Dat is de bedoelde, gecontroleerde
--               inhaalslag — geen backfill die een oordeel voorwendt dat
--               nooit is geveld.
--
-- IDEMPOTENT: na een ronde staat de stempel gelijk aan de huidige
--               motorversies, dus een tweede ronde selecteert nul.
--
-- EN EEN NIEUWE POORT: intel_priv.controleer_claiminvarianten() meet of
--               een claim meer bewijskracht draagt dan zijn plafond
--               toestaat, en of er claims onder een OUDE motor hangen.
--               Een APARTE functie, bewust: controleer_invarianten() is
--               79 regels security-kritieke SQL en die ga ik niet
--               overtypen om er een tak aan te hangen. src/cli/poort.ts
--               roept hem er los bij aan.
--
-- TERUGDRAAIEN: alter table intel.uitspraken drop column herbeoordeeld_onder;
--               en de functie droppen. Volledig additief.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- De stempel op de claim.

alter table intel.uitspraken
  add column if not exists herbeoordeeld_onder text;

comment on column intel.uitspraken.herbeoordeeld_onder is
  'De motorversies waaronder deze uitspraak voor het LAATST is gewogen, in de vorm '
  '"documentsoort-vX + claimmodaliteit-vY" (zie src/pijplijn/motorversies.ts). NULL betekent: '
  'nog nooit onder een benoemde motor gewogen, dus selecteerbaar. De herbeoordeling en de '
  'claimpoort selecteren op DIT veld en niet meer op brondocument_versies.documentsoort_versie: '
  'dat laatste wordt door de classificatietaak (prioriteit 21) bijgewerkt vóórdat de '
  'herbeoordeling (prioriteit 22) kijkt, en dan is de greep al weg.';

-- De selectie draait op (organisatie, stempel). Een gedeeltelijke index
-- op "nog te doen" zou kleiner zijn, maar de stempelwaarde verandert bij
-- elke motorversiewissel en dan is het predicaat van de index verouderd.
create index if not exists uitspraken_herbeoordeling_stempel_idx
  on intel.uitspraken (organisatie_id, herbeoordeeld_onder);

-- ---------------------------------------------------------------- 2
-- De claiminvarianten.

create or replace function intel_priv.controleer_claiminvarianten(p_motorversies text)
returns table(soort text, onderwerp text, bevinding text)
language sql
stable
set search_path to ''
as $function$
  -- 1. BEWIJSKRACHT BOVEN HET PLAFOND. herbeoordeelClaim() rekent
  --    min(oude, plafond) en schrijft plafond en kracht in dezelfde
  --    update weg, dus deze bevinding kan alleen bestaan als een claim
  --    de herbeoordeling heeft gemist. Dat is precies wat 0048 repareert.
  select 'bewijskracht_boven_plafond',
         'uitspraak ' || u.id::text,
         'bewijs_kwaliteit ' || u.bewijs_kwaliteit::text ||
         ' is hoger dan bewijskracht_plafond ' || coalesce(u.bewijskracht_plafond::text, 'NULL')
    from intel.uitspraken u
   where u.bewijskracht_plafond is not null
     and u.bewijs_kwaliteit > u.bewijskracht_plafond

  union all

  -- 2. BEVESTIGD ZONDER PRIMAIRE BINDING. De bewijsplicht-trigger hoort
  --    dit te verhinderen; deze tak is de onafhankelijke nameting. Een
  --    trigger die stil wordt uitgezet is anders niet te zien.
  select 'bevestigd_zonder_primaire_bron',
         'uitspraak ' || u.id::text,
         'status bevestigd zonder een binding met rol primair'
    from intel.uitspraken u
   where u.verificatie_status = 'bevestigd'
     and not exists (
       select 1 from intel.uitspraak_bronnen ub
        where ub.uitspraak_id = u.id and ub.rol = 'primair')

  union all

  -- 3. ONDER EEN OUDE MOTOR GEWOGEN. Geen defect op zichzelf: direct na
  --    een versiewissel is dit de normale, bedoelde toestand en de
  --    eerstvolgende ronde ruimt hem op. Hij staat hier omdat een
  --    herbeoordeling die STRUCTUREEL niet loopt anders onzichtbaar is —
  --    en dat was de situatie die 0048 repareert.
  --    Een menselijk oordeel wordt uitgesloten, net als in
  --    WACHT_OP_HERBEOORDELING_SQL.
  select 'herbeoordeling_achter',
         'uitspraak ' || u.id::text,
         'laatst gewogen onder ' || coalesce(u.herbeoordeeld_onder, 'GEEN MOTOR') ||
         ' terwijl de huidige motor ' || p_motorversies || ' is'
    from intel.uitspraken u
   where coalesce(u.oordeel_bron, 'motor') <> 'mens'
     and u.herbeoordeeld_onder is distinct from p_motorversies
$function$;

comment on function intel_priv.controleer_claiminvarianten(text) is
  'Drie invarianten over claims: bewijskracht boven het plafond, bevestigd zonder primaire '
  'binding, en achterlopend op de huidige motorversies. Een APARTE functie naast '
  'controleer_invarianten(), zodat die 79 regels security-kritieke SQL niet hoeft te worden '
  'herschreven om er een tak aan toe te voegen. src/cli/poort.ts roept hem er los bij aan en '
  'geeft MOTORVERSIES mee uit src/pijplijn/motorversies.ts.';

-- DE DEFAULT-ACL OP FUNCTIES IS PUBLIC EXECUTE; in dit schema eerder een
-- bevinding geweest. Daarom expliciet dicht en dan gericht open.
revoke all on function intel_priv.controleer_claiminvarianten(text) from public;
grant execute on function intel_priv.controleer_claiminvarianten(text) to vibe_intel_app;
grant execute on function intel_priv.controleer_claiminvarianten(text) to vibe_intel_lezer;
