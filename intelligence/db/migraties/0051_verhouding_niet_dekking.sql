-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0051 'dekking' heet voortaan 'verhouding'
-- ------------------------------------------------------------
-- WAAROM:       Het woord DEKKING beloofde iets dat het getal niet kan
--               waarmaken, en dat bleek pas toen er echte gegevens over
--               de volledige historie stonden.
--
--               Migratie 0050 voerde intel.analytics_dekkingsgraad in
--               met kolommen kliks_dekking en impressies_dekking, in de
--               veronderstelling dat de detaillaag een DEELVERZAMELING
--               van het propertytotaal is. Voor kliks houdt dat stand;
--               voor impressies niet. Gemeten op 5 november 2026, per
--               maand, dezelfde property, dezelfde dag:
--
--                 venster    kliks      impressies
--                 2026-06     66 %        124 %
--                 2026-07     64 %        103 %
--                 2026-08     40 %        101 %
--                 2026-09     66 %        101 %
--                 2026-10     45 %         72 %
--                 2026-11     42 %         77 %
--
--               Vier van de zes maanden geven boven 100 %. De oorzaak
--               is geen fout in de data en geen fout in 0050: GOOGLE'S
--               TOTALEN ZIJN NIET ADDITIEF OVER DIMENSIES. Het
--               ongedimensioneerde totaal ontdubbelt op zoekvertoning,
--               de gedimensioneerde rijen niet, en afhankelijk van hoe
--               het verkeer verdeeld is valt de som van de details
--               hoger of lager uit dan het totaal.
--
--               Een kolom die 124 % kan aangeven mag geen DEKKING
--               heten. 'Dekking' leest als 'welk deel hebben we',
--               en dan is 124 % onzin die iemand aan zichzelf gaat
--               uitleggen. Het is een VERHOUDING tussen twee
--               verschillend berekende getallen, en zo heet het nu.
--
--               WAT NIET VERANDERT: de twee ruwe getallen staan nog
--               steeds apart in intel.analytics_propertytotalen, en het
--               detailtotaal mag nog steeds nooit als propertytotaal
--               worden gepresenteerd. Dat was het punt van 0050 en dat
--               punt staat overeind. Alleen het label van de afgeleide
--               kolom was te veel belofte.
--
-- ------------------------------------------------------------
-- IDEMPOTENT:   JA. drop view if exists gevolgd door create view.
-- DESTRUCTIEF:  NEE. Een view bevat geen gegevens; de onderliggende
--               tabel intel.analytics_propertytotalen wordt niet
--               aangeraakt. Een create or replace view kan GEEN kolom
--               hernoemen — Postgres weigert dat — dus de view moet
--               eerst weg. Er is geen moment waarop gegevens ontbreken,
--               alleen een moment waarop de view niet bestaat.
-- ROLLBACK:     drop view if exists intel.analytics_verhoudingen;
--               en herstel de view uit migratie 0050.
-- ============================================================

set local lock_timeout = '5s';

drop view if exists intel.analytics_dekkingsgraad;

create view intel.analytics_verhoudingen as
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
         -- DE VERHOUDING detailmetingen / propertytotaal.
         --
         -- KAN BOVEN 1 UITKOMEN. Dat is geen fout: Google's totalen zijn
         -- niet additief over dimensies. Lees dit nooit als 'welk deel
         -- van de gegevens hebben we' — het is de uitkomst van een
         -- deling tussen twee verschillend berekende getallen.
         --
         -- NULL zolang het propertytotaal nul of niet gemeten is. Een
         -- ontbrekende verhouding is geen volledige dekking en ook geen
         -- nul.
         case when kliks > 0
              then detail_kliks::numeric / kliks
         end                                      as kliks_verhouding,
         case when impressies > 0
              then detail_impressies::numeric / impressies
         end                                      as impressies_verhouding,
         opgehaald_op
    from intel.analytics_propertytotalen;

comment on view intel.analytics_verhoudingen is
  'Propertytotaal naast detailtotaal, met de VERHOUDING detailmetingen/propertytotaal. Die verhouding KAN BOVEN 100% UITKOMEN — gemeten 124% in juni 2026 — omdat Google de totalen niet additief over dimensies berekent. Het is dus geen percentage datavolledigheid. De verhouding staat op NULL zolang er geen propertytotaal is gemeten: ontbrekend is niet volledig en niet nul.';

grant select on intel.analytics_verhoudingen to vibe_intel_app, vibe_intel_lezer;
