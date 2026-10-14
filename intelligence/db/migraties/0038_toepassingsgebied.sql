-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0038 het toepassingsgebied van een uitspraak
-- ------------------------------------------------------------
-- WAAROM:       De verwoordbaarheidspoort (verwoordbaarheidspoort() in
--               src/pijplijn/semantiek.ts) doet tien controles, en GEEN
--               ervan kijkt naar plaats, land of rechtsgebied. Gemeten
--               gedrag vandaag:
--
--                 bron: "De Belgische netbeheerder Fluvius verhoogt het
--                        nettarief in 2027 met 8%."
--                 zin:  "Volgens Fluvius stijgt het nettarief voor de
--                        netbeheerders in 2027 met 8%."
--                 uitslag: VERWOORDBAAR
--
--               Het woord 'Belgische' matcht niets. Er komt dus een
--               publiceerbare Nederlandse zin uit over een BELGISCH
--               tarief. Hetzelfde geldt voor een Vlaamse subsidie of een
--               Waalse wettelijke verplichting: buitenlandse tarieven,
--               subsidies en verplichtingen worden nu stil als
--               NEDERLANDSE feiten voorgesteld.
--
--               0024 heeft hiervoor al een vorm: VIJF voorwaardelijke
--               constraints die alleen gelden bij
--               verwoordbaar='VERWOORDBAAR' —
--               uitspraken_percentage_vraagt_grondtal,
--               uitspraken_tijdgebonden_vraagt_tijd (0027),
--               uitspraken_bedrag_vraagt_fenomeen,
--               uitspraken_kwalitatief_heeft_onderwerp en
--               uitspraken_termijn_vraagt_procedure. Een eis aan het
--               toepassingsgebied hoort in datzelfde patroon: de
--               database laat een uitspraak niet verwoordbaar heten als
--               niet vaststaat waar hij geldt.
--
-- WAAROM EEN EIGEN KOLOM EN NIET intel.uitspraak_geo
--
--               Die tabel bestaat (0003) met grondslag in
--               (bron_expliciet, code_match, afgeleid) en een verplicht
--               bewijsveld, maar heeft 0 rijen en GEEN ENKELE schrijver.
--               Hij bindt aan een rij in intel.geo_bereiken, en daar
--               staat alleen Nederland: 1 land, 12 provincies, 342
--               gemeenten, 6 netbeheerdergebieden. Er is geen BE- en
--               geen EU-rij, en herkenGebieden() (src/regio/gebieden.ts)
--               geeft gemeten 0 treffers EN 0 afwijzingen op zowel
--               Belgische als Nederlandse proefzinnen. BELGIE of EU is
--               daar vandaag dus niet aan te binden.
--
--               En intel.bronnen.geo_bereik (0002) kan het ook niet:
--               dat staat op 'nl' voor alle 29 bronnen en is een
--               eigenschap van de BRON, niet van het item. Het is
--               precies de aanname die het defect veroorzaakt, een laag
--               hoger.
--
-- WAT DIT DOET: 1 kolom intel.uitspraken.toepassingsgebied met vier
--                 toegestane waarden
--               2 kolom intel.uitspraken.toepassingsgebied_grondslag,
--                 verplicht zodra het gebied gezet is
--               3 een ZEVENDE waarde voor verwoordbaar:
--                 BUITEN_TOEPASSINGSGEBIED
--               4 de voorwaardelijke grendel: verwoordbaar='VERWOORDBAAR'
--                 vraagt een gebied, en dat gebied moet NEDERLAND of EU
--                 zijn
--
--               Additief. Beide kolommen zijn nullable, geen bestaande
--               rij wordt gewijzigd en geen oordeel wordt herschreven.
--
-- WAT DIT NIET DOET: geen enkele rij wordt gevuld en er wordt niets
--               teruggevuld. Een bestaande uitspraak houdt
--               toepassingsgebied NULL totdat hij opnieuw wordt
--               beoordeeld. intel.uitspraak_geo, intel.geo_bereiken en
--               intel.bronnen.geo_bereik blijven ongemoeid. Er komt geen
--               trigger: het vaststellen gebeurt in de pijplijn
--               (src/pijplijn/jurisdictie.ts), de database controleert
--               alleen de uitkomst.
--
-- GEMETEN OP DE LOKALE WEGWERPDATABASE (57 uitspraken: 26
--               CONTEXT_ONVOLLEDIG, 19 zonder oordeel, 8
--               VERIFICATIE_NODIG, 2 VEROUDERD, 2 VERWOORDBAAR), met de
--               nieuwe kolommen op NULL zoals direct na 'add column':
--
--                 de vierwaardengrendel      0 schendende rijen
--                 de grondslaggrendel        0 schendende rijen
--                 de zevenwaardengrendel     0 schendende rijen
--                 de voorwaardelijke grendel 2 schendende rijen (id 46, 57)
--
--               Daarom staat alleen de LAATSTE op 'not valid'; de andere
--               drie worden gewoon gevalideerd. Zie de toelichting bij 4.
--
-- TERUGDRAAIEN: alter table intel.uitspraken
--                 drop constraint if exists uitspraken_verwoordbaar_vraagt_gebied,
--                 drop constraint if exists uitspraken_gebied_heeft_grondslag,
--                 drop constraint if exists uitspraken_toepassingsgebied,
--                 drop column if exists toepassingsgebied_grondslag,
--                 drop column if exists toepassingsgebied;
--               en uitspraken_verwoordbaar terugzetten naar de zes
--               waarden van 0024:186-190. LET OP: dat laatste lukt
--               alleen als er dan geen rij meer op
--               BUITEN_TOEPASSINGSGEBIED staat, anders weigert de
--               teruggezette check. Eerst herbeoordelen, dan terugdraaien.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- VIER WAARDEN, NIET MEER. 'DUITSLAND' staat er bewust niet in: de
-- pijplijn kan dat vandaag niet vaststellen (geen patronen, geen rij in
-- intel.geo_bereiken), en een waarde die niets kan zetten is een lege
-- belofte. Een Duits feit komt daarmee op ONBEKEND uit, en dat is de
-- strenge kant.
alter table intel.uitspraken
  add column if not exists toepassingsgebied text;

alter table intel.uitspraken drop constraint if exists uitspraken_toepassingsgebied;
alter table intel.uitspraken add constraint uitspraken_toepassingsgebied check (
  toepassingsgebied is null or toepassingsgebied in (
    'NEDERLAND', 'BELGIE', 'EU', 'ONBEKEND'));

comment on column intel.uitspraken.toepassingsgebied is
  'Waar geldt deze uitspraak: ''NEDERLAND'', ''BELGIE'', ''EU'' of ''ONBEKEND''. Vastgesteld door '
  'bepaalToepassingsgebied() in src/pijplijn/jurisdictie.ts uit de brontekst, met de uitgever '
  'alleen als terugvaloptie. NULL betekent: nog niet beoordeeld — niet ''Nederland''. ONBEKEND is '
  'een echte uitslag en geen tussenstand: hij betekent dat het rechtsgebied niet vast te stellen '
  'was, bijvoorbeeld omdat er een Nederlands EN een Belgisch signaal in dezelfde tekst stond.';

-- ---------------------------------------------------------------- 2
-- Een uitslag zonder reden is geen uitslag. Zelfde eis als bij
-- relevantie (0019), de voorstellen (0021) en verwoordbaar zelf
-- (uitspraken_verwoordbaar_heeft_reden in 0024), en met dezelfde
-- ondergrens van 15 tekens.
alter table intel.uitspraken
  add column if not exists toepassingsgebied_grondslag text;

alter table intel.uitspraken drop constraint if exists uitspraken_gebied_heeft_grondslag;
alter table intel.uitspraken add constraint uitspraken_gebied_heeft_grondslag check (
  toepassingsgebied is null
  or (toepassingsgebied_grondslag is not null and length(toepassingsgebied_grondslag) >= 15));

comment on column intel.uitspraken.toepassingsgebied_grondslag is
  'WAAROM dat gebied, in onze woorden en navraagbaar: welk signaal in de tekst gevonden is '
  '(''BE-signaal "Belgische"''), of welke uitgeversregel gold. Verplicht zodra toepassingsgebied '
  'gezet is. Dit is een eigen formulering en geen citaat: de bronnen hieronder hebben '
  'mag_citeren=false, dus er wordt een signaalwoord benoemd, geen bronzin overgenomen.';

-- ---------------------------------------------------------------- 3
-- EEN ZEVENDE WAARDE, EN BEWUST NIET CONTEXT_ONVOLLEDIG.
--
-- De verleiding is om een Belgisch feit op CONTEXT_ONVOLLEDIG te zetten;
-- dat is immers al de grootste bak (26 van de 57). Maar de
-- verwoordbaarheidstrap in src/ops/meting.ts:385-398 groepeert
-- letterlijk op de waarde van `verwoordbaar`. Hergebruik maakt de
-- jurisdictieweigering daar dus onzichtbaar, precies op de meting die
-- bestaat om de flessenhals te laten zien.
--
-- En het zijn twee verschillende gebreken. CONTEXT_ONVOLLEDIG betekent:
-- er mist iets, haal het op en de uitspraak kan alsnog. BUITEN_
-- TOEPASSINGSGEBIED betekent: de uitspraak is compleet en klopt, maar
-- gaat niet over ons rechtsgebied. Dat laatste wordt nooit beter door
-- meer context.
alter table intel.uitspraken drop constraint if exists uitspraken_verwoordbaar;
alter table intel.uitspraken add constraint uitspraken_verwoordbaar check (
  verwoordbaar is null or verwoordbaar in (
    'VERWOORDBAAR', 'CONTEXT_ONVOLLEDIG', 'TEGENSTRIJDIG', 'VEROUDERD',
    'BRONGEBRUIK_BEPERKT', 'VERIFICATIE_NODIG', 'BUITEN_TOEPASSINGSGEBIED'));

comment on constraint uitspraken_verwoordbaar on intel.uitspraken is
  'De zeven uitslagen van de verwoordbaarheidspoort. BUITEN_TOEPASSINGSGEBIED is er sinds 0037 '
  'bij gekomen en is een EIGEN waarde, niet CONTEXT_ONVOLLEDIG: de verwoordbaarheidstrap in '
  'src/ops/meting.ts groepeert op deze kolom, dus hergebruik zou een jurisdictieweigering '
  'onzichtbaar maken. Inhoudelijk is het ook een ander gebrek: een uitspraak buiten het '
  'toepassingsgebied is compleet, maar gaat niet over Nederland.';

-- ---------------------------------------------------------------- 4
-- EEN FEIT ZONDER RECHTSGEBIED IS GEEN NEDERLANDS FEIT.
--
-- Zelfde vorm als uitspraken_tijdgebonden_vraagt_tijd (0027): de eis
-- geldt alleen voor wat we PUBLICEERBAAR verklaren, en laat al het
-- andere vrij. BELGIE en ONBEKEND kunnen dus niet VERWOORDBAAR zijn.
--
-- WAAROM EU WEL MAG EN BELGIE NIET
--
--   Een EU-verordening of een verplichting voor lidstaten werkt door in
--   Nederland; die uitspraak geldt hier dus ook, en een lezer wordt er
--   niet door misleid. Een Belgisch nettarief geldt hier niet — het is
--   een getal uit een ander stelsel, met andere netbeheerders, een
--   andere toezichthouder (CREG/VREG) en andere wetgeving. Dat getal in
--   een Nederlandse zin zetten maakt het onwaar, hoe correct het bij de
--   bron ook was.
--
-- WAAROM NOT VALID — GEMETEN, niet uit voorzichtigheid gekozen.
--
--   Op de lokale wegwerpdatabase staan 57 uitspraken, waarvan 2 op
--   VERWOORDBAAR (id 46 nettarief/percentage en id 57
--   netinvestering/bedrag). toepassingsgebied is voor élke bestaande rij
--   NULL, want de kolom wordt hierboven aangemaakt. Die twee rijen
--   schenden de grendel dus, en zonder 'not valid' breekt de loper af:
--
--     migratie 0038_toepassingsgebied.sql mislukt: check constraint
--     "uitspraken_verwoordbaar_vraagt_gebied" of relation "uitspraken"
--     is violated by some row
--
--   Dat is dezelfde val die 0027 op productie heeft laten afbreken en
--   de release half uitgerold liet staan. En het zijn juist de rijen die
--   deze migratie bestaat om te vinden: ze gebruiken om de migratie te
--   laten falen, maakt de vondst onbruikbaar.
--
--   NOT VALID bindt alle nieuwe en bijgewerkte rijen en laat de
--   historische rijen staan als een zichtbaar openstaand gegeven. Zodra
--   die zijn herbeoordeeld, sluit je de grendel alsnog met:
--
--     alter table intel.uitspraken validate constraint
--       uitspraken_verwoordbaar_vraagt_gebied;
--
--   De poortcontrole in de code weigert zo'n uitspraak hoe dan ook te
--   verwoorden. Deze constraint is de tweede grendel, niet de enige.
alter table intel.uitspraken drop constraint if exists uitspraken_verwoordbaar_vraagt_gebied;
alter table intel.uitspraken add constraint uitspraken_verwoordbaar_vraagt_gebied check (
  verwoordbaar is distinct from 'VERWOORDBAAR'
  or (toepassingsgebied is not null and toepassingsgebied in ('NEDERLAND', 'EU'))) not valid;

comment on constraint uitspraken_verwoordbaar_vraagt_gebied on intel.uitspraken is
  'Een VERWOORDBAAR verklaarde uitspraak moet een toepassingsgebied hebben, en dat moet '
  'NEDERLAND of EU zijn. EU mag omdat een Europese verplichting ook in Nederland geldt; BELGIE '
  'mag niet omdat een Belgisch tarief hier niets betekent, en ONBEKEND niet omdat een '
  'onvastgesteld rechtsgebied geen bewijs van Nederlanderschap is. Staat op not valid: bij het '
  'toepassen schonden 2 van de 57 bestaande uitspraken hem, omdat de kolom voor hen NULL is.';

-- Hoeveel rijen staan er buiten de grendel? Zonder dit getal is de
-- openstaande schuld onzichtbaar, en op productie is de database niet van
-- buiten te bevragen. Het antwoord landt dus in het deploylog.
do $$
declare aantal bigint;
begin
  select count(*) into aantal
    from intel.uitspraken
   where verwoordbaar = 'VERWOORDBAAR'
     and (toepassingsgebied is null or toepassingsgebied not in ('NEDERLAND', 'EU'));
  raise notice '0037 toepassingsgebied: % bestaande uitspraak(en) buiten de grendel (not valid)', aantal;
end $$;

-- Dezelfde vorm als uitspraken_verwoordbaar_idx uit 0024: de meting
-- groepeert per organisatie op deze kolom, en alleen beoordeelde rijen
-- doen daar mee.
create index if not exists uitspraken_toepassingsgebied_idx
  on intel.uitspraken (organisatie_id, toepassingsgebied)
  where toepassingsgebied is not null;
