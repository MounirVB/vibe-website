-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0011 url_is_identiteit
-- ------------------------------------------------------------
-- WAAROM:       Migratie 0009 nam de dedupregel van de nieuwsradar
--               over: unique (bron_id, canonieke_url). Voor een
--               nieuwsbron is dat juist — daar identificeert de URL
--               het item. Voor drie bronsoorten is het fout, en dat
--               bleek bij de eerste echte collectorrun:
--                 * WFS-features (mijnaansluiting) hebben geen eigen
--                   URL, alleen een feature-id;
--                 * catalogusrijen (CBS) kunnen dezelfde tabel-URL
--                   delen;
--                 * een tijdreeks citeert per dag hetzelfde endpoint.
--               Drie bronnen vielen daardoor om op een duplicate key.
--
--               De identiteit is in die gevallen extern_id, en die is
--               al uniek via brondocumenten_extern_uniek. Daarom wordt
--               de URL-uniciteit voorwaardelijk gemaakt in plaats van
--               afgeschaft: voor feeds, sitemaps en SRU blijft hij
--               gelden, want daar is hij de bescherming tegen
--               dubbele items.
-- ADDITIVE:     JA — één kolom met een default, en de unique index
--               wordt partieel. Geen bestaande rij verdwijnt.
-- IDEMPOTENT:   JA — add column if not exists, drop/create index if
--               (not) exists.
-- DESTRUCTIEF:  NEE.
-- ROLLBACK:     drop index if exists intel.brondocumenten_bron_url_uniek;
--               create unique index brondocumenten_bron_url_uniek
--                 on intel.brondocumenten (bron_id, canonieke_url);
--               alter table intel.brondocumenten
--                 drop column if exists url_is_identiteit;
--               (de eerste stap faalt als er inmiddels bronnen met
--                gedeelde URL's in staan — dat is precies het probleem
--                dat deze migratie oplost)
-- ============================================================

set local lock_timeout = '5s';
set local statement_timeout = '120s';

alter table intel.brondocumenten
  add column if not exists url_is_identiteit boolean not null default true;

comment on column intel.brondocumenten.url_is_identiteit is
  'True voor bronsoorten waarbij de URL het item identificeert (rss, atom, sitemap, sru, html_lijst). False voor json_api, odata, wfs, tijdreeks en dataset: daar is extern_id de identiteit.';

-- Bestaande rijen bijwerken op basis van de soort van hun bron.
update intel.brondocumenten d
   set url_is_identiteit = false
  from intel.bronnen b
 where b.id = d.bron_id
   and b.soort in ('json_api', 'odata', 'wfs', 'tijdreeks', 'dataset')
   and d.url_is_identiteit;

drop index if exists intel.brondocumenten_bron_url_uniek;

create unique index if not exists brondocumenten_bron_url_uniek
  on intel.brondocumenten (bron_id, canonieke_url)
  where url_is_identiteit;

set local lock_timeout = default;
set local statement_timeout = default;
