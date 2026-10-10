-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0012 levert_gebeurtenissen
-- ------------------------------------------------------------
-- WAAROM:       De eerste clusterronde maakte 342 marktgebeurtenissen
--               van PDOK-gemeentegrenzen en 6 van netbeheergebieden.
--               Dat is fout: referentiegeografie is geen gebeurtenis
--               in de markt. Een gemeentegrens die in de bron staat
--               betekent niet dat er iets gebeurd is.
--
--               Niet elke bron voedt dus dezelfde laag. PDOK en Mijn
--               Aansluiting vullen intel.geo_bereiken; ze horen de
--               gebeurtenissenstroom niet te raken. Dat onderscheid
--               hoort expliciet in het bronregister en niet in een
--               impliciete uitzondering in de clustercode.
-- ADDITIVE:     JA — één kolom met default true, plus het markeren van
--               de onterecht aangemaakte gebeurtenissen als afgewezen.
--               Er wordt niets verwijderd: een gebeurtenis die bestond
--               blijft met reden zichtbaar.
-- IDEMPOTENT:   JA — add column if not exists; het markeren is
--               begrensd op status 'nieuw'/'verrijkt' en een vaste
--               reden, dus een tweede run doet niets.
-- DESTRUCTIEF:  NEE.
-- ROLLBACK:     alter table intel.bronnen drop column if exists levert_gebeurtenissen;
--               update intel.markt_gebeurtenissen set status = 'verrijkt'
--                where status = 'afgewezen'
--                  and materialiteit_grondslag->>'afgewezen_reden'
--                      = 'referentiebron levert geen gebeurtenissen';
-- ============================================================

set local lock_timeout = '5s';
set local statement_timeout = '120s';

alter table intel.bronnen
  add column if not exists levert_gebeurtenissen boolean not null default true;

comment on column intel.bronnen.levert_gebeurtenissen is
  'False voor referentiebronnen (PDOK, Mijn Aansluiting): die vullen intel.geo_bereiken en horen niet in de gebeurtenissenstroom.';

-- De gebeurtenissen die in de eerste ronde onterecht zijn aangemaakt
-- worden afgewezen, niet verwijderd. Het auditspoor blijft dan heel en
-- het dashboard kan laten zien waarom ze er niet meer tussen staan.
update intel.markt_gebeurtenissen g
   set status = 'afgewezen',
       materialiteit_grondslag =
         g.materialiteit_grondslag
         || jsonb_build_object(
              'afgewezen_reden', 'referentiebron levert geen gebeurtenissen',
              'afgewezen_op', now()::text)
 where g.status in ('nieuw', 'verrijkt')
   and exists (
     select 1
       from intel.gebeurtenis_documenten gd
       join intel.brondocumenten d on d.id = gd.brondocument_id
       join intel.bronnen b on b.id = d.bron_id
      where gd.gebeurtenis_id = g.id
        and b.soort in ('wfs', 'dataset')
        and b.uitgever in ('PDOK / Kadaster', 'Mijn Aansluiting (gezamenlijke netbeheerders)')
   );

set local lock_timeout = default;
set local statement_timeout = default;
