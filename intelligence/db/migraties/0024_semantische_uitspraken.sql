-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0024 semantische uitspraken
-- ------------------------------------------------------------
-- WAAROM:       Een geverifieerd getal is geen publiceerbare bewering.
--               Gemeten in productie stond dit in intel.uitspraken, met
--               verificatie_status 'bevestigd' en bewijs_kwaliteit 5:
--
--                 waarde 8,  eenheid '%',   onderwerp 'netbeheer'
--                 waarde 60, eenheid '%',   onderwerp 'netcongestie'
--                 waarde 200000000000, eenheid 'EUR'
--
--               8% van WAT? 200 miljard WAARVOOR? De bronzin weet het,
--               de bewaarde uitspraak niet. `soort` is een grove klasse
--               ('cijfer', 'prijs') en `onderwerp` is een clustersleutel.
--               Geen van beide benoemt de grootheid.
--
--               De vijfde poort (`verwoordbaarheid`) weigerde daarom
--               terecht elke feitelijke alinea. Die poort blijft staan.
--               Deze migratie lost het probleem BOVENSTROOMS op: ze geeft
--               een uitspraak de velden waarmee hij zichzelf kan
--               verklaren.
--
-- WAAROM EEN GECONTROLEERD VOCABULAIRE EN GEEN VRIJE TEKST
--
--               De verleiding is om de subjectzin uit de bron te
--               bewaren en te hergebruiken. Dat mag niet: de bronnen
--               waar deze uitspraken uit komen hebben mag_citeren =
--               false en citaat_limiet_tekens = 0. Een overgenomen
--               woordgroep is een citaat, ook als hij kort is.
--
--               Daarom `fenomeen` en `subject` uit een EIGEN
--               vocabulaire. 'nettarief' en 'kleinverbruiker' zijn onze
--               woorden, afgeleid uit de brontekst door trefwoorden te
--               herkennen. De verwoording gebruikt dus onze taal en niet
--               die van de uitgever — dat lost het citaatprobleem en het
--               betekenisprobleem in één keer op.
--
-- WAT DIT DOET: additief. Elk nieuw veld mag NULL zijn, want niet elke
--               uitspraak draagt elke vorm van context. De validatie is
--               SOORTSPECIFIEK: een percentage heeft een grondtal nodig,
--               een bedrag een fenomeen, een deadline een procedure. Een
--               kwalitatieve beleidsuitspraak heeft geen getal nodig.
--
--               Geen bestaande rij wordt gewijzigd, geen bronrecord
--               aangeraakt, geen auditregel herschreven.
--
-- TERUGDRAAIEN: alter table intel.uitspraken
--                 drop column semantiek_soort, drop column fenomeen, ...
--               (volledige lijst onderaan dit bestand)
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Het semantische vocabulaire — onze woorden, niet die van de bron
-- ------------------------------------------------------------
create table if not exists intel.fenomenen (
  sleutel        text primary key,
  naam           text not null,
  -- Hoe je dit fenomeen in een Nederlandse zin noemt, met lidwoord.
  zinsvorm       text not null,
  -- Welke eenheden hierbij kloppen. Leeg = geen eenheidseis.
  eenheden       text[] not null default '{}',
  -- Een percentage van dit fenomeen heeft dit grondtal nodig.
  vraagt_grondtal boolean not null default false,
  toelichting    text
);

comment on table intel.fenomenen is
  'De grootheden die dit platform kan benoemen, in EIGEN woorden. Nodig omdat de '
  'bronnen citeren verbieden: een overgenomen woordgroep uit de brontekst is een '
  'citaat, ook als hij kort is. Met dit vocabulaire verwoordt het platform een '
  'uitspraak in zijn eigen taal.';

insert into intel.fenomenen (sleutel, naam, zinsvorm, eenheden, vraagt_grondtal, toelichting) values
  ('nettarief',         'Nettarief',              'het nettarief',                      array['EUR','%','EUR/MWh','ct/kWh'], true,  'Wat een netbeheerder in rekening brengt.'),
  ('netinvestering',    'Netinvestering',         'de investering in het net',           array['EUR'], false, 'Investeringsbedrag in infrastructuur.'),
  ('subsidiebudget',    'Subsidiebudget',         'het subsidiebudget',                  array['EUR'], false, 'Beschikbaar budget van een regeling.'),
  ('subsidiebedrag',    'Subsidiebedrag',         'het subsidiebedrag',                  array['EUR','EUR/MWh','ct/kWh'], false, 'Bedrag per aanvraag of per eenheid.'),
  ('batterijcapaciteit','Batterijcapaciteit',     'de batterijcapaciteit',               array['kWh','MWh','GWh'], false, 'Energie-inhoud. NOOIT kW.'),
  ('opgesteldvermogen', 'Opgesteld vermogen',     'het opgestelde vermogen',             array['kW','MW','GW','kWp','MWp','kVA','MVA'], false, 'Vermogen. NOOIT kWh.'),
  ('aansluitvermogen',  'Aansluitvermogen',       'het aansluitvermogen',                array['kW','MW','kVA','MVA'], false, 'Gecontracteerd of fysiek vermogen.'),
  ('transportvermogen', 'Transportvermogen',      'het gecontracteerde transportvermogen', array['kW','MW','kVA','MVA'], false, 'Wat de netbeheerder toestaat.'),
  ('netcapaciteit',     'Beschikbare netcapaciteit','de beschikbare netcapaciteit',      array['kW','MW','MVA','%'], true,  'Ruimte op het net.'),
  ('energieverbruik',   'Energieverbruik',        'het energieverbruik',                 array['kWh','MWh','GWh'], false, null),
  ('energieproductie',  'Energieproductie',       'de energieproductie',                 array['kWh','MWh','GWh'], false, null),
  ('elektriciteitsprijs','Elektriciteitsprijs',   'de elektriciteitsprijs',              array['EUR/MWh','ct/kWh','EUR'], false, null),
  ('doorlooptijd',      'Doorlooptijd',           'de doorlooptijd',                     array['jaar','maand','dag','week'], false, null),
  ('aantal_aanvragen',  'Aantal aanvragen',       'het aantal aanvragen',                array['%','stuks'], true,  null),
  ('aantal_projecten',  'Aantal projecten',       'het aantal projecten',                array['%','stuks'], true,  null),
  ('wachttijd',         'Wachttijd',              'de wachttijd',                        array['jaar','maand','week','dag'], false, null),
  ('opdrachtwaarde',    'Opdrachtwaarde',         'de waarde van de opdracht',           array['EUR'], false, 'Geschatte of gegunde waarde van een aanbesteding.')
on conflict (sleutel) do update set
  naam = excluded.naam, zinsvorm = excluded.zinsvorm, eenheden = excluded.eenheden,
  vraagt_grondtal = excluded.vraagt_grondtal, toelichting = excluded.toelichting;

create table if not exists intel.subjecten (
  sleutel     text primary key,
  naam        text not null,
  -- Hoe je dit subject in een zin noemt.
  zinsvorm    text not null,
  toelichting text
);

insert into intel.subjecten (sleutel, naam, zinsvorm, toelichting) values
  ('kleinverbruiker',  'Kleinverbruikers',      'kleinverbruikers',                      'Aansluiting tot en met 3x80A.'),
  ('grootverbruiker',  'Grootverbruikers',      'grootverbruikers',                      'Aansluiting groter dan 3x80A.'),
  ('huishouden',       'Huishoudens',           'huishoudens',                           'Particulier. Let op: Vibe Energy is B2B.'),
  ('bedrijf',          'Bedrijven',             'bedrijven',                             null),
  ('netbeheerder',     'Netbeheerders',         'de netbeheerders',                      null),
  ('landelijk_net',    'Het landelijke net',    'het landelijke elektriciteitsnet',      null),
  ('regionaal_net',    'Het regionale net',     'het regionale net',                     null),
  ('overheid',         'De overheid',           'de overheid',                           null),
  ('aanvrager',        'Aanvragers',            'aanvragers',                            null),
  ('opdrachtgever',    'De opdrachtgever',      'de opdrachtgever',                      null)
on conflict (sleutel) do update set
  naam = excluded.naam, zinsvorm = excluded.zinsvorm, toelichting = excluded.toelichting;

grant select on intel.fenomenen to vibe_intel_app, vibe_intel_lezer;
grant select on intel.subjecten to vibe_intel_app, vibe_intel_lezer;

-- ------------------------------------------------------------
-- 2. De semantische velden op de uitspraak
-- ------------------------------------------------------------
alter table intel.uitspraken
  -- WAT voor uitspraak is dit? Bepaalt welke validatie geldt.
  add column if not exists semantiek_soort text,
  -- WAT is gemeten, in onze woorden.
  add column if not exists fenomeen text references intel.fenomenen(sleutel),
  -- OVER WIE of WAT gaat het.
  add column if not exists subject text references intel.subjecten(sleutel),
  -- Stijging, daling of een niveau?
  add column if not exists richting text,
  -- Het grondtal van een percentage: 8% VAN wat.
  add column if not exists grondtal text,
  -- De oorspronkelijke uitdrukking, alleen het getaldeel.
  -- '€200 miljard' is een getal, geen beschermde formulering.
  add column if not exists uitdrukking text,
  -- Is de waarde exact, benaderd of begrensd?
  add column if not exists exactheid text,
  add column if not exists bereik_min numeric,
  add column if not exists bereik_max numeric,
  -- De schaal die in de bron stond, apart bewaard zodat verlies zichtbaar is.
  add column if not exists schaalwoord text,
  -- Waar geldt het, en wanneer.
  add column if not exists geo_bereik text,
  add column if not exists periode text,
  add column if not exists periode_van date,
  add column if not exists periode_tot date,
  -- Waar staat het in de bron.
  add column if not exists bron_vindplaats text,
  -- Voorwaarden en uitzonderingen, in onze woorden.
  add column if not exists voorwaarden text[],
  add column if not exists uitzonderingen text[],
  -- Waarmee wordt vergeleken.
  add column if not exists vergelijkingsbasis text,
  -- De uitslag van de verwoordbaarheidspoort, met reden.
  add column if not exists verwoordbaar text,
  add column if not exists verwoordbaar_reden text,
  add column if not exists verwoordbaar_op timestamptz,
  -- Is de semantiek GEMETEN uit de bron of AFGELEID? Nooit door elkaar.
  add column if not exists semantiek_herkomst text,
  add column if not exists semantiek_op timestamptz;

-- ------------------------------------------------------------
-- 3. Vocabulaires als constraint, niet als afspraak
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_semantiek_soort;
alter table intel.uitspraken add constraint uitspraken_semantiek_soort check (
  semantiek_soort is null or semantiek_soort in (
    'bedrag', 'percentage', 'energie', 'vermogen', 'netcapaciteit',
    'datum', 'termijn', 'subsidievoorwaarde', 'regelwijziging',
    'aanbestedingsstatus', 'marktstatistiek', 'vergelijking', 'kwalitatief'));

alter table intel.uitspraken drop constraint if exists uitspraken_richting;
alter table intel.uitspraken add constraint uitspraken_richting check (
  richting is null or richting in ('stijging', 'daling', 'niveau', 'ongewijzigd'));

alter table intel.uitspraken drop constraint if exists uitspraken_exactheid;
alter table intel.uitspraken add constraint uitspraken_exactheid check (
  exactheid is null or exactheid in (
    'exact', 'benaderd', 'ondergrens', 'bovengrens', 'bereik', 'geschat'));

alter table intel.uitspraken drop constraint if exists uitspraken_verwoordbaar;
alter table intel.uitspraken add constraint uitspraken_verwoordbaar check (
  verwoordbaar is null or verwoordbaar in (
    'VERWOORDBAAR', 'CONTEXT_ONVOLLEDIG', 'TEGENSTRIJDIG', 'VEROUDERD',
    'BRONGEBRUIK_BEPERKT', 'VERIFICATIE_NODIG'));

-- Een uitslag zonder reden is geen uitslag; dat geldt hier net als bij
-- relevantie (0019) en bij de voorstellen (0021).
alter table intel.uitspraken drop constraint if exists uitspraken_verwoordbaar_heeft_reden;
alter table intel.uitspraken add constraint uitspraken_verwoordbaar_heeft_reden check (
  verwoordbaar is null or (verwoordbaar_reden is not null and length(verwoordbaar_reden) >= 15));

-- GEMETEN en AFGELEID mogen nooit door elkaar lopen. Een afgeleide
-- semantiek is een gevolgtrekking van ons, geen vondst in de bron.
alter table intel.uitspraken drop constraint if exists uitspraken_semantiek_herkomst;
alter table intel.uitspraken add constraint uitspraken_semantiek_herkomst check (
  semantiek_herkomst is null or semantiek_herkomst in (
    'bron_expliciet', 'bron_patroon', 'afgeleid', 'handmatig'));

-- ------------------------------------------------------------
-- 4. SOORTSPECIFIEKE VALIDATIE
-- ------------------------------------------------------------
-- Niet elk veld hoort bij elke soort. Dit is het verschil tussen een
-- model dat alles toestaat en een model dat betekenis afdwingt.

-- EEN PERCENTAGE ZONDER GRONDTAL IS GEEN BEWERING.
-- Dit is de constraint die '8%' tegenhoudt: 8% van wat?
alter table intel.uitspraken drop constraint if exists uitspraken_percentage_vraagt_grondtal;
alter table intel.uitspraken add constraint uitspraken_percentage_vraagt_grondtal check (
  semantiek_soort <> 'percentage'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
  or (grondtal is not null and length(grondtal) >= 3));

-- EEN BEDRAG ZONDER FENOMEEN IS GEEN BEWERING.
-- Dit houdt '200000000000 euro' tegen: 200 miljard waarvoor?
alter table intel.uitspraken drop constraint if exists uitspraken_bedrag_vraagt_fenomeen;
alter table intel.uitspraken add constraint uitspraken_bedrag_vraagt_fenomeen check (
  semantiek_soort <> 'bedrag'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
  or fenomeen is not null);

-- EEN TERMIJN ZONDER PROCEDURE IS GEEN DEADLINE.
alter table intel.uitspraken drop constraint if exists uitspraken_termijn_vraagt_procedure;
alter table intel.uitspraken add constraint uitspraken_termijn_vraagt_procedure check (
  semantiek_soort <> 'termijn'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
  or (fenomeen is not null or grondtal is not null or voorwaarden is not null));

-- VERMOGEN EN ENERGIE MOGEN NOOIT DOOR ELKAAR.
-- kW is geen kWh. Dit is geen stijlkwestie: een batterij van 232 kW is
-- een andere batterij dan een van 232 kWh, en het verschil bepaalt de
-- businesscase.
alter table intel.uitspraken drop constraint if exists uitspraken_vermogen_is_geen_energie;
alter table intel.uitspraken add constraint uitspraken_vermogen_is_geen_energie check (
  semantiek_soort <> 'vermogen' or eenheid is null
  or eenheid in ('kW','MW','GW','kWp','MWp','Wp','kVA','MVA'));

alter table intel.uitspraken drop constraint if exists uitspraken_energie_is_geen_vermogen;
alter table intel.uitspraken add constraint uitspraken_energie_is_geen_vermogen check (
  semantiek_soort <> 'energie' or eenheid is null
  or eenheid in ('kWh','MWh','GWh'));

-- EEN BEREIK HEEFT TWEE GRENZEN, EN ZE STAAN IN DE JUISTE ORDE.
alter table intel.uitspraken drop constraint if exists uitspraken_bereik_compleet;
alter table intel.uitspraken add constraint uitspraken_bereik_compleet check (
  exactheid <> 'bereik'
  or (bereik_min is not null and bereik_max is not null and bereik_min <= bereik_max));

-- EEN KWALITATIEVE UITSPRAAK HEEFT GEEN GETAL NODIG, maar wel een
-- fenomeen of een subject; anders gaat hij over niets.
alter table intel.uitspraken drop constraint if exists uitspraken_kwalitatief_heeft_onderwerp;
alter table intel.uitspraken add constraint uitspraken_kwalitatief_heeft_onderwerp check (
  semantiek_soort <> 'kwalitatief'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
  or (fenomeen is not null or subject is not null));

-- ------------------------------------------------------------
-- 5. Append-only correctieketen: nooit stil overschrijven
-- ------------------------------------------------------------
-- Par. 9 en 19: een nieuwere uitspraak vervangt een oudere, maar de
-- oudere blijft staan. Deze tabel legt de keten vast in plaats van de
-- geschiedenis te overschrijven.
create table if not exists intel.uitspraak_correcties (
  id              bigint generated always as identity primary key,
  organisatie_id  bigint not null references intel.organisaties(id) on delete restrict,
  -- De uitspraak die wordt vervangen.
  vervangen_id    bigint not null references intel.uitspraken(id) on delete restrict,
  -- Degene die hem vervangt.
  vervanger_id    bigint not null references intel.uitspraken(id) on delete restrict,
  soort           text not null check (soort in (
                    'termijn_verzet', 'voorwaarde_gewijzigd', 'gegund',
                    'netstatus_gewijzigd', 'statistiek_herzien', 'rectificatie')),
  grondslag       text not null,
  vastgesteld_op  timestamptz not null default now(),
  constraint correctie_niet_zichzelf check (vervangen_id <> vervanger_id),
  constraint correctie_heeft_grondslag check (length(grondslag) >= 20),
  constraint correctie_een_keer unique (vervangen_id, vervanger_id)
);

create index if not exists correcties_vervangen_idx
  on intel.uitspraak_correcties (organisatie_id, vervangen_id);
create index if not exists correcties_vervanger_idx
  on intel.uitspraak_correcties (organisatie_id, vervanger_id);

alter table intel.uitspraak_correcties enable row level security;
drop policy if exists correcties_eigen_organisatie on intel.uitspraak_correcties;
create policy correcties_eigen_organisatie on intel.uitspraak_correcties
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

-- INSERT en SELECT, geen UPDATE en geen DELETE: dit is een logboek.
grant select, insert on intel.uitspraak_correcties to vibe_intel_app;
grant usage on sequence intel.uitspraak_correcties_id_seq to vibe_intel_app;
grant select on intel.uitspraak_correcties to vibe_intel_lezer;

-- ------------------------------------------------------------
-- 6. Indexen en toelichting
-- ------------------------------------------------------------
create index if not exists uitspraken_verwoordbaar_idx
  on intel.uitspraken (organisatie_id, verwoordbaar)
  where verwoordbaar is not null;
create index if not exists uitspraken_semantiek_idx
  on intel.uitspraken (organisatie_id, semantiek_soort, fenomeen)
  where semantiek_soort is not null;

comment on column intel.uitspraken.uitdrukking is
  'De oorspronkelijke getaluitdrukking, bijvoorbeeld ''EUR 200 miljard'' of ''circa 60%''. '
  'Alleen het getaldeel: dat is een getal en geen beschermde formulering. Bewaard naast '
  'de genormaliseerde waarde zodat schaalverlies aantoonbaar is.';
comment on column intel.uitspraken.grondtal is
  'Het grondtal van een percentage: 8% VAN wat. Zonder dit veld is een percentage geen '
  'bewering, en de constraint uitspraken_percentage_vraagt_grondtal houdt dat tegen.';
comment on column intel.uitspraken.semantiek_herkomst is
  '''bron_expliciet'' of ''bron_patroon'' = uit de brontekst gehaald. ''afgeleid'' = onze '
  'gevolgtrekking. Die twee mogen nooit door elkaar lopen; een afgeleide semantiek maakt '
  'een uitspraak niet geverifieerd.';
comment on table intel.uitspraak_correcties is
  'Append-only keten van vervangingen. Een verzette deadline of een herziene statistiek '
  'overschrijft de oude uitspraak NIET; hij komt ernaast te staan met een verwijzing.';

commit;
