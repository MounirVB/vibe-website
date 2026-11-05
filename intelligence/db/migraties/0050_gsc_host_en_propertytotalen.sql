-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0050 GSC: host, propertytotalen, koppelbewijs
-- ------------------------------------------------------------
-- WAAROM:       Drie dingen die pas zichtbaar werden toen er op
--               5 november 2026 voor het eerst ECHTE Search
--               Console-gegevens in de database stonden. Alle drie
--               gemeten, geen van drie vermoed.
--
-- ------------------------------------------------------------
-- 1 DE DOMEINPROPERTY LAAT HOSTS SAMENVALLEN, EN DE UPSERT OVERSCHRIJFT
--
-- `haalZoekvragen()` deed `new URL(url).pathname` en gooide de host weg.
-- Een sc-domain-property dekt ELKE host onder het domein, en deze
-- property leverde er in het eerste venster (2026-10-06 t/m 2026-11-03)
-- drie:
--
--     www.vibeenergy.nl          7.084 impressies   55 kliks   111 paden
--     dashboard.vibeenergy.nl       37 impressies    2 kliks     1 pad
--     vibeenergy.nl (apex)           6 impressies    0 kliks     1 pad
--
-- Negen sleutels botsten daardoor: 18 ruwe rijen die op 9 rijen in de
-- tabel landden. De upsert deed `impressies = excluded.impressies`, dus
-- de laatst geschreven rij won. Per cel nagemeten:
--
--     17-10 "vibe energy" + / + MOBILE   Google 6 impressies, 1 KLIK
--                                        tabel  2 impressies, 0 kliks
--     03-11 "vibe"        + / + DESKTOP  Google 4 impressies, 1 KLIK
--                                        tabel  1 impressie,  0 kliks
--
-- Die "2 impressies, 0 kliks" IS de dashboardrij, letterlijk, op de
-- plek van de homepage. Dat is geen te laag getal maar een getal van
-- een ander ding. Twee homepage-merkkliks van 55 verdwenen zo, en het
-- landingspaginarapport mengde twee applicaties.
--
-- OVERSCHRIJVEN ZELF IS JUIST: een hersynchronisatie van dezelfde dag
-- moet niet optellen, anders verdubbelt elke ronde. De fout zat in de
-- SLEUTEL, die de host niet kende. Daarom hier een hostbewuste sleutel
-- en niet een optellende upsert.
--
-- DE LEGACYRIJEN HOUDEN pagina_host NULL. Dat is eerlijk: voor een rij
-- die vóór deze migratie is opgehaald IS de host niet meer te bepalen —
-- bij de negen botsende rijen is hij per definitie ambigu. Een
-- sentinelwaarde zou een bewering zijn die we niet kunnen doen. De
-- synchronisatie ruimt ze op het moment dat hij een venster opnieuw
-- ophaalt; zie `synchroniseerGsc()`.
--
-- ------------------------------------------------------------
-- 2 DE DETAILLAAG IS EEN DEELVERZAMELING, EN DAT STOND NERGENS
--
-- Voor hetzelfde venster, dezelfde property, dezelfde dag gemeten:
--
--     Google zonder dimensies     126 kliks   9.891 impressies   CTR 1,27%   positie 26,21
--     Google met dimensie query    57 kliks   6.410 impressies
--     onze detailtabel             55 kliks   7.113 impressies   CTR 0,77%   positie 34,72
--
-- Het verschil is Google's anonimisering van zeldzame zoekvragen, en
-- die is GROOT: 44% van de kliks en 72% van de impressies haalt de
-- detaillaag. Wie "55 kliks" leest als wat de site kreeg, zit er ruim
-- een factor twee naast.
--
-- Niets legde het propertytotaal vast, dus het dashboard KON het
-- onderscheid niet maken. intel.analytics_propertytotalen legt het
-- totaal vast zoals Google het zelf rapporteert, naast wat de
-- detaillaag draagt, met de dekkingsgraad erbij.
--
-- EEN ONTBREKEND PROPERTYTOTAAL IS GEEN NUL EN GEEN 100% DEKKING. De
-- view laat de aandelen op NULL staan zolang er geen totaalrij is.
--
-- ------------------------------------------------------------
-- 3 HET KOPPELINGENREGISTER MELDDE EEN WERKENDE KOPPELING ALS AFWEZIG
--
-- Het signaal `koppelingen/analytics en CRM` meldde "5 van 5 NIET
-- AANGESLOTEN: ... gsc" op het moment dat GSC 4.361 rijen had
-- weggeschreven. Twee oorzaken stapelden:
--
--   a) config.ts eiste INTEL_GSC_CLIENT_EMAIL + _PRIVATE_KEY +
--      _SITE_URL en kende de werkende tweede route niet:
--      INTEL_GCS_SLEUTEL (de dienstaccount-JSON) + _SITE_URL;
--   b) zaai.ts schrijft dat register uit de omgeving van het proces dat
--      hem draait, en `npm run zaai` is de pre-deploy van
--      vibe-intel-api — een dienst die geen van die variabelen heeft.
--      Een dienst ZONDER credentials overschreef dus de status van een
--      koppeling die elders werkte.
--
-- De structurele fout is dat één statusveld twee verschillende dingen
-- moest dragen: "is het geconfigureerd waar ik nu sta" en "werkt het".
-- Deze migratie scheidt die twee. `status` blijft de configuratiekant;
-- de nieuwe kolommen dragen het BEWIJS, en bewijs mag alleen door een
-- proces worden geschreven dat de koppeling werkelijk heeft gebruikt.
--
-- ------------------------------------------------------------
-- IDEMPOTENT:   JA. add column if not exists, create table if not
--               exists, create index if not exists, create or replace
--               view, en de constraintwissel staat in een do-blok dat
--               op pg_constraint toetst.
-- DESTRUCTIEF:  NEE. Geen drop van een kolom, geen delete, geen update
--               van bestaande rijen. De oude unieke constraint wordt
--               vervangen door een ruimere: elke rij die onder de oude
--               constraint paste, past ook onder de nieuwe.
-- ROLLBACK:     alter table intel.zoekvraag_metingen
--                 drop constraint if exists zoekvraag_metingen_uniek_host,
--                 drop column if exists pagina_host;
--               alter table intel.zoekvraag_metingen add constraint
--                 zoekvraag_metingen_uniek unique nulls not distinct
--                 (organisatie_id, bron, datum, zoekvraag, pagina_pad, land, apparaat);
--               drop view if exists intel.analytics_dekkingsgraad;
--               drop view if exists intel.zoekvraag_per_host;
--               drop table if exists intel.analytics_propertytotalen;
--               alter table intel.koppelingen
--                 drop column if exists laatste_sync_op,
--                 drop column if exists laatste_sync_bewijs,
--                 drop column if exists bewijs_door;
--               alter table intel.koppelingen
--                 drop constraint if exists koppelingen_status_check;
--               alter table intel.koppelingen add constraint
--                 koppelingen_status_check check (status in
--                 ('niet_geconfigureerd','geconfigureerd','geverifieerd','fout'));
--               revoke delete on intel.zoekvraag_metingen from vibe_intel_app;
--
--               DRIE DINGEN DIE BIJ TERUGDRAAIEN FOUT GAAN als je ze
--               niet eerst afhandelt:
--                 * de oude unieke constraint botst op rijen die ná
--                   deze migratie met verschillende hosts op hetzelfde
--                   pad zijn geschreven — ontdubbel die eerst;
--                 * de oude status-CHECK botst op elke rij die
--                   inmiddels 'bereikbaar' draagt — zet die eerst op
--                   'geconfigureerd';
--                 * zonder het delete-recht blijft de opruiming van
--                   host-loze rijen halverwege steken, dus draai de
--                   code mee terug en niet alleen het schema.
-- ============================================================

set local lock_timeout = '5s';

-- ------------------------------------------------------------
-- 1 · De host per zoekvraagrij.
-- ------------------------------------------------------------

alter table intel.zoekvraag_metingen
  add column if not exists pagina_host text;

comment on column intel.zoekvraag_metingen.pagina_host is
  'De host uit de GSC-pagina-URL. Een domeinproperty dekt meerdere hosts; zonder deze kolom vallen www, apex en elk subdomein op hetzelfde pad samen en overschrijft de laatste rij de vorige. NULL betekent: opgehaald vóór migratie 0050, host niet meer te bepalen.';

comment on column intel.zoekvraag_metingen.pagina_pad is
  'Het pad zonder host. Samen met pagina_host reconstrueert dit de URL. Aggregeer nooit op pad alleen bij een domeinproperty.';

-- De sleutelwissel. Eerst de nieuwe erbij, dan de oude eraf: op geen
-- enkel moment staat de tabel zonder uniciteitsbescherming.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'zoekvraag_metingen_uniek_host'
                    and conrelid = 'intel.zoekvraag_metingen'::regclass) then
    alter table intel.zoekvraag_metingen
      add constraint zoekvraag_metingen_uniek_host
      unique nulls not distinct
        (organisatie_id, bron, datum, zoekvraag, pagina_host, pagina_pad, land, apparaat);
  end if;

  if exists (select 1 from pg_constraint
              where conname = 'zoekvraag_metingen_uniek'
                and conrelid = 'intel.zoekvraag_metingen'::regclass) then
    alter table intel.zoekvraag_metingen
      drop constraint zoekvraag_metingen_uniek;
  end if;
end $$;

create index if not exists zoekvraag_metingen_host_idx
  on intel.zoekvraag_metingen (organisatie_id, pagina_host, datum desc)
  where pagina_host is not null;

-- Per host optellen, zodat website en dashboard nooit meer in één
-- getal zitten en een propertybreed beeld tóch mogelijk blijft.
create or replace view intel.zoekvraag_per_host as
  select organisatie_id,
         bron,
         pagina_host,
         min(datum)                        as vanaf,
         max(datum)                        as tot,
         count(*)                          as rijen,
         count(distinct zoekvraag)         as zoekvragen,
         count(distinct pagina_pad)        as paden,
         sum(impressies)                   as impressies,
         sum(kliks)                        as kliks,
         case when sum(impressies) > 0
              then sum(kliks)::numeric / sum(impressies)
         end                               as ctr,
         -- Nul-gebaseerde teller, dus +1 om bij positie 1 uit te komen.
         case when sum(impressies) > 0 and sum(positie_som) is not null
              then sum(positie_som) / sum(impressies) + 1
         end                               as gemiddelde_positie
    from intel.zoekvraag_metingen
   group by organisatie_id, bron, pagina_host;

comment on view intel.zoekvraag_per_host is
  'Zoekprestaties per host. Een domeinproperty bevat meerdere applicaties; deze view houdt ze gescheiden. Som over alle rijen voor een propertybreed beeld van de DETAILLAAG — dat is niet het propertytotaal, zie intel.analytics_propertytotalen.';

-- ------------------------------------------------------------
-- 2 · De propertytotalen zoals Google ze zelf rapporteert.
-- ------------------------------------------------------------

create table if not exists intel.analytics_propertytotalen (
  id                bigint generated always as identity primary key,
  organisatie_id    bigint not null references intel.organisaties(id) on delete restrict,
  bron              text not null check (bron in ('gsc', 'bing_webmaster')),
  property          text not null,
  datum_vanaf       date not null,
  datum_tot         date not null,

  -- Zoals de bron het zonder dimensies teruggeeft. Dit IS het totaal.
  kliks             integer,
  impressies        integer,
  ctr               numeric(7,6),
  positie_som       numeric,
  positie_conventie text not null default 'onbekend'
                      check (positie_conventie in ('een_gebaseerd', 'nul_gebaseerd', 'onbekend')),

  -- Wat de detaillaag voor exact dezelfde periode draagt. Apart
  -- opgeslagen zodat de dekkingsgraad een MEETWAARDE is en geen
  -- berekening over twee tabellen die uit de pas kunnen lopen.
  detail_kliks      integer,
  detail_impressies integer,
  detail_rijen      integer,

  opgehaald_op      timestamptz not null default now(),
  opmerking         text,

  constraint analytics_propertytotalen_periode_logisch check (datum_tot >= datum_vanaf),
  constraint analytics_propertytotalen_uniek
    unique (organisatie_id, bron, property, datum_vanaf, datum_tot)
);

comment on table intel.analytics_propertytotalen is
  'Het totaal zoals de bron het zonder dimensies rapporteert, naast wat de detaillaag draagt. Bestaat omdat de detaillaag een DEELVERZAMELING is: Google anonimiseert zeldzame zoekvragen, en op 5 november 2026 haalde de detaillaag 44% van de kliks en 72% van de impressies. Een detailtotaal mag nooit als propertytotaal worden gepresenteerd.';

comment on column intel.analytics_propertytotalen.positie_som is
  'De teller: nul-gebaseerde positie maal impressies, net als in zoekvraag_metingen. Het gemiddelde hoort in de view.';

create index if not exists analytics_propertytotalen_idx
  on intel.analytics_propertytotalen (organisatie_id, bron, datum_vanaf desc);

-- De dekkingsgraad, met NULL waar niets is gemeten.
create or replace view intel.analytics_dekkingsgraad as
  select organisatie_id,
         bron,
         property,
         datum_vanaf,
         datum_tot,
         kliks                                    as property_kliks,
         impressies                               as property_impressies,
         ctr                                      as property_ctr,
         case when impressies > 0 and positie_som is not null
              then positie_som / impressies + 1
         end                                      as property_positie,
         detail_kliks,
         detail_impressies,
         detail_rijen,
         -- NUL IS HIER GEEN ANTWOORD. Zonder propertytotaal is de
         -- dekkingsgraad onbekend, niet 0% en niet 100%.
         case when kliks > 0
              then detail_kliks::numeric / kliks
         end                                      as kliks_dekking,
         case when impressies > 0
              then detail_impressies::numeric / impressies
         end                                      as impressies_dekking,
         opgehaald_op
    from intel.analytics_propertytotalen;

comment on view intel.analytics_dekkingsgraad is
  'Propertytotaal naast detailtotaal, met het aandeel dat de detaillaag dekt. De aandelen staan op NULL zolang er geen propertytotaal is gemeten: een ontbrekende dekking is geen volledige dekking.';

-- ------------------------------------------------------------
-- RLS en grants voor het nieuwe.
--
-- DE INVARIANTTOETS PAKTE DIT, en terecht: een tenanttabel zonder row
-- level security is een tabel waar organisatie A de rijen van B kan
-- lezen. Hetzelfde patroon als in 0006.
-- ------------------------------------------------------------

alter table intel.analytics_propertytotalen enable row level security;
drop policy if exists analytics_propertytotalen_eigen_organisatie on intel.analytics_propertytotalen;
create policy analytics_propertytotalen_eigen_organisatie on intel.analytics_propertytotalen
  for all to vibe_intel_app, vibe_intel_lezer
  using (organisatie_id = (select intel_priv.huidige_organisatie()))
  with check (organisatie_id = (select intel_priv.huidige_organisatie()));

grant select, insert, update on intel.analytics_propertytotalen to vibe_intel_app;
grant select on intel.analytics_propertytotalen to vibe_intel_lezer;
grant usage on sequence intel.analytics_propertytotalen_id_seq to vibe_intel_app;

grant select on intel.zoekvraag_per_host to vibe_intel_app, vibe_intel_lezer;
grant select on intel.analytics_dekkingsgraad to vibe_intel_app, vibe_intel_lezer;

/* DELETE OP ZOEKVRAAG_METINGEN, en alleen daarom.

   De applicatierol had select, insert en update — geen delete. Dat was
   juist zolang er niets te verwijderen viel. De opruiming van de
   legacyrijen zonder host heeft het nodig, en zonder dit recht zou die
   stap met 'permission denied' falen ná een geslaagde ophaling: de
   oogst binnen, de oude rijen blijven staan, en elke som telt dubbel.

   Het recht is zo smal als het kan: één tabel, en de enige code die
   het gebruikt verwijdert uitsluitend rijen met pagina_host IS NULL
   binnen het venster dat op dat moment is opgehaald. */
grant delete on intel.zoekvraag_metingen to vibe_intel_app;

-- ------------------------------------------------------------
-- 3 · Bewijs in het koppelingenregister, los van de configuratiestand.
-- ------------------------------------------------------------

alter table intel.koppelingen
  add column if not exists laatste_sync_op     timestamptz,
  add column if not exists laatste_sync_bewijs text,
  add column if not exists bewijs_door         text;

comment on column intel.koppelingen.status is
  'DE CONFIGURATIEKANT: zijn de omgevingsvariabelen aanwezig waar dit is gemeten. Zegt NIETS over of de koppeling werkt — daarvoor is laatste_sync_op het bewijs. Een proces zonder credentials mag deze waarde niet verlagen voor een koppeling die elders aantoonbaar werkt.';

comment on column intel.koppelingen.laatste_sync_op is
  'Wanneer deze koppeling voor het laatst AANTOONBAAR gegevens heeft geleverd. Alleen te schrijven door een proces dat de koppeling werkelijk heeft gebruikt. NULL betekent: nooit aangetoond, niet: stuk.';

comment on column intel.koppelingen.bewijs_door is
  'Welk proces het bewijs schreef, zodat te zien is of de meting uit de juiste dienst komt.';

/* DE VIJFDE TOESTAND: BEREIKBAAR.

   De bestaande reeks was niet_geconfigureerd / geconfigureerd /
   geverifieerd / fout, en daarin ontbrak het geval dat op 1 november
   2026 vier dagen lang de werkelijkheid was: de credential werkt, de
   API antwoordt, het token is geldig — en er komen geen gegevens
   omdat de machtiging op de property ontbreekt.

   Dat is niet 'geconfigureerd' (we weten méér: we hebben Google
   gesproken), niet 'geverifieerd' (er staat niets), en niet zonder
   meer 'fout' (er is niets stuk; er mist een handeling van een mens).
   Zo'n geval tussen wal en schip laten vallen is precies hoe een
   monitor een valse groene of een vals rode wordt. */
do $$
begin
  if exists (select 1 from pg_constraint
              where conname = 'koppelingen_status_check'
                and conrelid = 'intel.koppelingen'::regclass) then
    alter table intel.koppelingen drop constraint koppelingen_status_check;
  end if;
  alter table intel.koppelingen add constraint koppelingen_status_check
    check (status in ('niet_geconfigureerd', 'geconfigureerd', 'bereikbaar',
                      'geverifieerd', 'fout'));
end $$;
