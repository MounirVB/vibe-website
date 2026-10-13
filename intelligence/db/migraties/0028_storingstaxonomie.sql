-- ============================================================
-- 0028 — storingstaxonomie op intel.bronnen
-- ------------------------------------------------------------
-- Par. 2/3 van release 3.0.3: een connector die niet levert moet
-- zeggen WAAROM, in een vaste taxonomie. 'DEGRADED' met een vrije
-- tekst is te weinig om op te handelen: een 503 van vandaag vraagt
-- opnieuw proberen, een 403 vraagt een gesprek met de uitgever, en
-- een robots.txt die niet te lezen is vraagt dat we juist NIET
-- proberen.
--
-- Waarom dit nodig was, gemeten op 12 oktober 2026:
--   * rendo-nieuws stond in de brief als HTTP 403. De opgeslagen
--     gezondheid zei HEALTHY en een live probe gaf HTTP 200 met een
--     feed van 44 KB. De 403 was tijdelijk.
--   * rvo-subsidie-sitemap stond op DEGRADED met 'HTTP 500'. Een live
--     probe gaf HTTP 200 met 1,86 MB.
--   * tenderned staat op DEGRADED omdat /robots.txt 302 geeft naar
--     /cms/robots.txt en DAT 503 geeft. Dat is geen tijdelijke storing
--     van de dataroute maar een onleesbaar beleid, en RFC 9309 zegt
--     dan: niets ophalen.
-- Drie bronnen, drie verschillende oorzaken, één label. Daarom deze
-- kolommen.
--
-- OPGESCHORT OPHALEN, MET HERCONTROLE
-- Een bron die ons de deur wijst blijven aankloppen is onbehoorlijk en
-- levert niets op. `ophalen_opgeschort_tot` zet de bron stil tot een
-- afgesproken moment; de planner slaat hem tot dan over en probeert het
-- daarna één keer opnieuw. De GESCHIEDENIS blijft staan: geen
-- brondocument, versie of uitspraak wordt hierdoor aangeraakt.
-- ============================================================

alter table intel.bronnen
  add column if not exists storingssoort            text,
  add column if not exists storing_sinds            timestamptz,
  add column if not exists storing_detail           text,
  add column if not exists ophalen_opgeschort_tot   timestamptz,
  add column if not exists hercontrole_interval_minuten integer;

-- De taxonomie. Negen soorten, want dat zijn de negen die in deze
-- markt echt voorkomen en elk een ander antwoord vragen.
alter table intel.bronnen drop constraint if exists bronnen_storingssoort_geldig;
alter table intel.bronnen add constraint bronnen_storingssoort_geldig check (
  storingssoort is null or storingssoort in (
    -- 5xx, time-out: komt vrijwel zeker terug. Gewoon opnieuw proberen.
    'TIJDELIJKE_STORING',
    -- 403, of een robots.txt/TDM-voorbehoud dat ons buitensluit. Niet
    -- omheen werken; opschorten en de uitgever vragen.
    'TOEGANG_BEPERKT',
    -- 429 of een Retry-After. Zelfde route, lagere frequentie.
    'SNELHEIDSBEGRENSD',
    -- 404/410: het adres bestaat niet (meer). Vraagt een nieuw adres.
    'ONGELDIG_ENDPOINT',
    -- De route werkt, de inhoud is niet te lezen. Vraagt een parser.
    'ONTLEDING_MISLUKT',
    -- Alles werkt en er is niets nieuws. GEEN storing.
    'LEEG_MAAR_GEZOND',
    -- De uitgever heeft de route uitgefaseerd.
    'AFGESCHAFT',
    -- 401: er is een sleutel nodig die we niet hebben.
    'NIET_GEAUTORISEERD',
    -- DNS, TLS, verbinding geweigerd: onder de HTTP-laag.
    'NETWERKFOUT'));

alter table intel.bronnen drop constraint if exists bronnen_hercontrole_positief;
alter table intel.bronnen add constraint bronnen_hercontrole_positief check (
  hercontrole_interval_minuten is null or hercontrole_interval_minuten >= 5);

-- Een storingssoort zonder begintijd is niet te interpreteren: 'hoe
-- lang al' is de helft van het antwoord.
alter table intel.bronnen drop constraint if exists bronnen_storing_heeft_begin;
alter table intel.bronnen add constraint bronnen_storing_heeft_begin check (
  storingssoort is null or storing_sinds is not null);

create index if not exists bronnen_storingssoort_idx
  on intel.bronnen (organisatie_id, storingssoort)
  where storingssoort is not null;

create index if not exists bronnen_opgeschort_idx
  on intel.bronnen (organisatie_id, ophalen_opgeschort_tot)
  where ophalen_opgeschort_tot is not null;

comment on column intel.bronnen.storingssoort is
  'Vaste taxonomie van waarom een bron niet levert. null = geen storing. Bepaalt of opnieuw proberen zin heeft.';
comment on column intel.bronnen.ophalen_opgeschort_tot is
  'Tot dit moment niet ophalen. Voor bronnen die ons bewust buitensluiten; de planner slaat ze over en probeert daarna eenmaal opnieuw.';
comment on column intel.bronnen.storing_detail is
  'De gemeten details: HTTP-status, foutsoort, en wat een live probe opleverde. Bewijs, niet een gevoel.';
