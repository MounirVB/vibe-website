-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0020 aanbestedingsfase en harde identiteit
-- ------------------------------------------------------------
-- WAAROM:       0019 is gebouwd op een aanname die bij nameten onjuist
--               bleek. Die migratie staat al toegepast en wordt daarom
--               NIET herschreven; deze migratie draagt de correctie.
--
-- WAT 0019 AANNAM
--               'Gemeten: alle vier hebben tekst_lengte 0. TenderNed
--                levert in de aankondigingenlijst alleen een titel en
--                een URL.'
--
--               De eerste helft was waar, de tweede niet. tekst_lengte 0
--               was een CONFIGGAT aan onze kant: de json_api-config van
--               tenderned-publicaties had geen tekstVelden, dus
--               parsers.ts zette tekst op null. De bron leverde de
--               inhoud wel.
--
-- WAT ER OP 12 OKTOBER 2026 IS GEMETEN
--               Op het AL GEREGISTREERDE endpoint (pagina 0, size=100):
--               een lijst-item heeft NEGENTIEN velden, niet vijf.
--
--                 opdrachtBeschrijving  gevuld op 100 van 100
--                                       (min 13, mediaan 342, max 1533)
--                 kenmerk               100 van 100, 72 UNIEKE waarden
--                 typePublicatie.code   100 van 100
--                 sluitingsDatum        71 van 100
--
--               Drie gevolgen, elk een gemeten fout:
--
--               1. 72 unieke kenmerken voor 100 publicaties. Publicaties
--                  tellen telt aanbestedingen ruim een derde te hoog.
--                  Veertien kenmerken dragen meer dan een publicatie;
--                  kenmerk 581533 draagt er zes (AAO, 4x REC, AGO).
--
--               2. Publicatie 441673 ('Realisatie zonnepanelen Limburgs
--                  Museum') heeft typePublicatie AGO — Aankondiging
--                  GEGUNDE opdracht. Die stond in productie als
--                  openstaande commerciele kans. De titel verraadt het
--                  niet; de code wel.
--
--               3. De twee Rotterdam-publicaties uit de kop van 0019
--                  hebben BEIDE kenmerk 599611. De relatie is dus niet
--                  'onbekend' maar 'zelfde_inkoop', hard bewezen. En
--                  belangrijker: 434533 sluit 2026-10-08, 443632
--                  (de rectificatie) sluit 2026-12-02. De rectificatie
--                  VERZET de termijn. Wie de oudste publicatie
--                  aanhoudt, schrijft een lopende aanbesteding af als
--                  verlopen.
--
-- WAT DIT DOET: additief. Twee kolomgroepen, een uniek index die de
--               dedup in de database vastlegt in plaats van alleen in de
--               code, en bijgewerkte kolomtoelichtingen op 0019.
--               Geen kolom verdwijnt, geen waarde wordt herschreven.
--
-- TERUGDRAAIEN: drop index intel.kansen_identiteit_uniek;
--               alter table intel.kansen
--                 drop column fase, drop column fase_grondslag,
--                 drop column identiteit, drop column identiteit_grondslag;
--               alter table intel.kans_publicaties
--                 drop column publicatie_soort, drop column sluitingsdatum_bron;
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. De fase van de aanbesteding
-- ------------------------------------------------------------
-- Het vocabulaire is GEMETEN, niet uit documentatie overgenomen.
-- Pagina 0 van de geregistreerde CPV-lijst, 12 oktober 2026:
--   AAO 37  Aankondiging opdracht          -> open
--   REC 21  Rectificatie                   -> open
--   AGO 19  Aankondiging gegunde opdracht  -> eindstand
--   VAK 11  Vooraankondiging               -> te vroeg
--   MAC  8  Marktconsultatie               -> te vroeg
--   VBE  4  Vroegtijdige beeindiging       -> eindstand
-- 'onbekend' staat erbij voor een code die wij nog niet kennen. Dat is
-- een gat in ONS vocabulaire en mag geen uitspraak over de aanbesteding
-- worden; daarom een eigen waarde en geen stille val naar 'open'.
alter table intel.kansen
  add column if not exists fase text,
  add column if not exists fase_grondslag text[] not null default '{}',
  add column if not exists identiteit text,
  add column if not exists identiteit_grondslag text;

alter table intel.kansen
  drop constraint if exists kansen_fase_vocabulaire;
alter table intel.kansen
  add constraint kansen_fase_vocabulaire check (
    fase is null or fase in (
      'vooraankondiging', 'marktconsultatie', 'open',
      'gegund', 'beeindigd', 'onbekend'));

-- Een vastgestelde fase draagt ALTIJD zijn grondslag, net als
-- relevantie_grondslag op markt_gebeurtenissen (0019 regel 86).
alter table intel.kansen
  drop constraint if exists kansen_fase_heeft_grondslag;
alter table intel.kansen
  add constraint kansen_fase_heeft_grondslag check (
    fase is null or fase_grondslag <> '{}'::text[]);

-- EEN EINDSTAND KAN GEEN WERKVOORRAAD ZIJN.
-- Dit is de databasegrendel onder de fout van publicatie 441673. Een
-- gegunde of beeindigde aanbesteding mag niet in een status staan die
-- zegt dat er nog iets te halen valt. GEWONNEN en VERLOREN blijven
-- toegestaan: dat zijn onze eigen uitkomsten op diezelfde aanbesteding.
alter table intel.kansen
  drop constraint if exists kansen_eindstand_niet_in_werkvoorraad;
alter table intel.kansen
  add constraint kansen_eindstand_niet_in_werkvoorraad check (
    fase is null
    or fase not in ('gegund', 'beeindigd')
    or status in ('GEWONNEN', 'VERLOREN', 'GEARCHIVEERD', 'AFGEWEZEN'));

-- ------------------------------------------------------------
-- 2. Identiteit: de dedup hoort in de database, niet alleen in de code
-- ------------------------------------------------------------
-- `identiteit` is 'kenmerk:599611' als de bron een kenmerk levert, en
-- anders 'titel:<opdrachtgever>::<titelkern>'. Het unieke index maakt
-- dubbeltelling onmogelijk in plaats van onwaarschijnlijk: twee
-- publicaties van dezelfde aanbesteding KUNNEN geen twee kansen worden,
-- ook niet als de code ooit regresseert.
--
-- Partieel, omdat identiteit mag ontbreken voor kansen die niet uit een
-- aanbestedingsbron komen.
create unique index if not exists kansen_identiteit_uniek
  on intel.kansen (organisatie_id, identiteit)
  where identiteit is not null;

create index if not exists kansen_fase_idx
  on intel.kansen (organisatie_id, fase, score_relevantie desc)
  where fase is not null;

-- ------------------------------------------------------------
-- 3. Per publicatie: welke fase was dit, en droeg hij de termijn?
-- ------------------------------------------------------------
alter table intel.kans_publicaties
  add column if not exists publicatie_soort text,
  add column if not exists sluitingsdatum_bron date;

comment on column intel.kans_publicaties.publicatie_soort is
  'De gemeten typePublicatie-code van DEZE publicatie (AAO/REC/AGO/VAK/MAC/VBE). '
  'Hiermee is na te gaan welke publicatie de fase van de kans bepaalde: dat is '
  'altijd de nieuwste.';
comment on column intel.kans_publicaties.sluitingsdatum_bron is
  'De sluitingsdatum zoals DEZE publicatie hem noemde. Wijkt die af van '
  'intel.kansen.sluit_op, dan is hij door een latere publicatie vervangen. '
  'Gemeten voorbeeld: kenmerk 599611 had 2026-10-08 in publicatie 434533 en '
  '2026-12-02 in rectificatie 443632.';

-- ------------------------------------------------------------
-- 4. De toelichtingen van 0019 bijwerken
-- ------------------------------------------------------------
-- 0019 zegt dat de aankondigingenlijst geen inhoud levert. Dat is bij
-- nameten onjuist gebleken, en een onjuiste toelichting in de database
-- is erger dan geen toelichting: hij wordt geloofd.
comment on column intel.kansen.sluit_op is
  'De GELDENDE sluitingsdatum: die van de nieuwste publicatie die er een draagt. '
  'Een rectificatie verzet de termijn, dus de oudste publicatie aanhouden kan een '
  'lopende aanbesteding onterecht als verlopen afschrijven. Mag leeg zijn; dan is '
  'de termijn een onderzoeksvraag en niet nul.';
comment on column intel.kans_publicaties.relatie is
  'Hoe deze publicatie zich tot de andere binnen de kans verhoudt. Eerste keus is '
  'het kenmerk uit de aankondiging zelf: gelijk kenmerk is ''zelfde_inkoop'', hard '
  'bewijs. ''onbekend'' blijft een geldige uitkomst voor bronnen die geen kenmerk '
  'leveren, maar is geen plaatsvervanger voor niet gemeten hebben: voor TenderNed '
  'ligt het kenmerk gewoon in de lijst-API (gemeten 100 van 100, 2026-10-12).';
comment on column intel.kansen.fase is
  'De fase van de AANBESTEDING, afgeleid uit de nieuwste publicatie. Gemeten '
  'vocabulaire 2026-10-12: AAO/REC open, AGO gegund, VBE beeindigd, VAK/MAC te '
  'vroeg. Een gegunde opdracht is geen kans, hoe goed het onderwerp ook past.';
comment on column intel.kansen.identiteit is
  'Waarop deze kans is samengenomen. ''kenmerk:<nr>'' bij een bron die een kenmerk '
  'levert, anders ''titel:<opdrachtgever>::<titelkern>''. Gemeten: 100 publicaties '
  'leverden 72 unieke kenmerken, dus zonder deze sleutel telt het platform '
  'aanbestedingen ruim een derde te hoog.';

commit;
