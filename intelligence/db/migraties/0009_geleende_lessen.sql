-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0009 geleende lessen
-- ------------------------------------------------------------
-- WAAROM:       In costa-select-dashboard draait al een volwassen
--               nieuwsradar en een SEO Control Center voor
--               vibehome.nl. Die hebben een aantal fouten al
--               betaald. Deze migratie neemt hun bewezen
--               constraints over in plaats van ze opnieuw te maken.
--               Zie docs/intelligence/ARCHITECTUUR.md, sectie
--               "Geleende lessen", voor de herkomst per punt.
-- ADDITIVE:     JA — alleen nieuwe kolommen, constraints, indexen
--               en een view. Geen kolom verdwijnt, geen type wijzigt.
-- IDEMPOTENT:   JA — add column if not exists, DO-blokken rond
--               constraints, create index if not exists,
--               create or replace view.
-- DESTRUCTIEF:  NEE.
-- ROLLBACK:     alter table intel.zoekvraag_metingen
--                 drop column if exists positie_som,
--                 drop column if exists epoch_versie;
--               drop view if exists intel.zoekvraag_per_vraag;
--               alter table intel.bronnen
--                 drop column if exists tdm_status,
--                 drop column if exists toegestane_hosts,
--                 drop column if exists max_bytes,
--                 drop column if exists gezondheid,
--                 drop column if exists gezondheid_reden;
--               alter table intel.brondocumenten
--                 drop column if exists datum_herkomst;
--               alter table intel.uitspraken drop column if exists vertrouwen;
--               alter table intel.inhoud_versies
--                 drop column if exists blokkades,
--                 drop column if exists inhoud_afdruk,
--                 drop column if exists goedgekeurde_afdruk,
--                 drop column if exists bewerkt_door,
--                 drop column if exists goedgekeurd_door;
--               alter table intel.koppelingen
--                 drop column if exists vertrouwd,
--                 drop column if exists gevalideerd_op;
--               (bijbehorende constraints verdwijnen met de kolommen)
-- ============================================================

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- ============================================================
-- 1. BRONVOORWAARDEN: TDM-voorbehoud, redirect-allowlist, bytegrens
-- ------------------------------------------------------------
-- Gemeten in het zusterplatform (2026-09-15): TenneT noemt
-- AI/TDM-crawlers in robots.txt en geeft 403 op een botuseragent;
-- NOS, NU.nl en Solar Magazine blokkeren ClaudeBot, GPTBot, CCBot,
-- Google-Extended en PerplexityBot. robots.txt lezen is dus niet
-- genoeg: een tekst-en-datamining-voorbehoud is een aparte status.
-- ============================================================

alter table intel.bronnen
  add column if not exists tdm_status text not null default 'onbekend',
  add column if not exists toegestane_hosts text[] not null default '{}',
  add column if not exists max_bytes integer not null default 2097152,
  add column if not exists gezondheid text not null default 'ONBEKEND',
  add column if not exists gezondheid_reden text,
  add column if not exists laatst_item_op timestamptz;

comment on column intel.bronnen.tdm_status is
  'Tekst-en-datamining-voorbehoud (EU-auteursrecht). voorbehoud = niet ophalen, ook als robots.txt het toestaat.';
comment on column intel.bronnen.toegestane_hosts is
  'Redirect-allowlist. Een feed die naar een andere host verwijst wordt geweigerd in plaats van gevolgd.';
comment on column intel.bronnen.max_bytes is
  'Per bron, want ze schelen een factor honderd. Beschermt tegen een bron die plots een dump levert.';
comment on column intel.bronnen.gezondheid is
  'QUIET is bewust geen DEGRADED: een bron die door een uitsluitpatroon leegloopt is gezond maar stil.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'bronnen_tdm_status_geldig'
                    and conrelid = 'intel.bronnen'::regclass) then
    alter table intel.bronnen add constraint bronnen_tdm_status_geldig
      check (tdm_status in ('geen_voorbehoud', 'voorbehoud', 'onbekend'));
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'bronnen_gezondheid_geldig'
                    and conrelid = 'intel.bronnen'::regclass) then
    alter table intel.bronnen add constraint bronnen_gezondheid_geldig
      check (gezondheid in ('HEALTHY', 'DEGRADED', 'QUIET', 'BROKEN', 'DISABLED', 'ONBEKEND'));
  end if;

  -- De harde poort: ophalen mag alleen als robots EN tdm het toestaan.
  -- Een actieve bron zonder gemeten toestemming kan dus niet bestaan.
  if not exists (select 1 from pg_constraint
                  where conname = 'bronnen_actief_vereist_toestemming'
                    and conrelid = 'intel.bronnen'::regclass) then
    alter table intel.bronnen add constraint bronnen_actief_vereist_toestemming
      check (
        not actief
        or (robots_status = 'toegestaan' and tdm_status = 'geen_voorbehoud')
      );
  end if;
end $$;

create index if not exists bronnen_gezondheid_idx
  on intel.bronnen (organisatie_id, gezondheid)
  where gezondheid <> 'HEALTHY';

-- ============================================================
-- 2. DATUMHERKOMST: waar komt de publicatiedatum vandaan
-- ------------------------------------------------------------
-- Een datum uit een feed is iets anders dan een lastmod uit een
-- sitemap. Zonder dit veld wordt een sitemapdatum later als
-- publicatiedatum behandeld, en dat verschuift de versheid.
-- ============================================================

alter table intel.brondocumenten
  add column if not exists datum_herkomst text not null default 'onbekend';

comment on column intel.brondocumenten.datum_herkomst is
  'feed | sitemap_lastmod | news_sitemap | item_metadata | pagina_inhoud | onbekend.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'brondocumenten_datum_herkomst_geldig'
                    and conrelid = 'intel.brondocumenten'::regclass) then
    alter table intel.brondocumenten add constraint brondocumenten_datum_herkomst_geldig
      check (datum_herkomst in (
        'feed', 'sitemap_lastmod', 'news_sitemap', 'item_metadata', 'pagina_inhoud', 'onbekend'));
  end if;
end $$;

-- Dedup per bron op canonieke URL. Bewust per bron en niet globaal:
-- twee bronnen die hetzelfde feit beschrijven zijn twee
-- waarnemingen, en dat is precies het bewijs dat we willen.
create unique index if not exists brondocumenten_bron_url_uniek
  on intel.brondocumenten (bron_id, canonieke_url);

-- ============================================================
-- 3. VERTROUWENSPLAFOND PER UITSPRAAKSOORT
-- ------------------------------------------------------------
-- Een berekening of een commerciele gevolgtrekking mag nooit
-- hetzelfde vertrouwen krijgen als een feit uit een primaire bron.
-- Dat is hier een databaseconstraint, zodat ook een los script het
-- niet kan omzeilen.
-- ============================================================

alter table intel.uitspraken
  add column if not exists vertrouwen numeric(3,2);

comment on column intel.uitspraken.vertrouwen is
  'Plafond per soort: feit/regel/datum 1.00, cijfer/prijs/specificatie 0.90, berekening 0.80, interpretatie 0.70.';

do $$
begin
  -- 'berekening' en 'interpretatie' toevoegen aan de toegestane soorten.
  if exists (select 1 from pg_constraint
              where conname = 'uitspraken_soort_check'
                and conrelid = 'intel.uitspraken'::regclass) then
    alter table intel.uitspraken drop constraint uitspraken_soort_check;
  end if;
  alter table intel.uitspraken add constraint uitspraken_soort_check
    check (soort in (
      'feit', 'cijfer', 'datum', 'regel', 'prijs', 'specificatie', 'status',
      'berekening', 'interpretatie'));

  if not exists (select 1 from pg_constraint
                  where conname = 'uitspraken_vertrouwensplafond'
                    and conrelid = 'intel.uitspraken'::regclass) then
    alter table intel.uitspraken add constraint uitspraken_vertrouwensplafond
      check (
        vertrouwen is null
        or (vertrouwen >= 0 and vertrouwen <= case soort
              when 'feit'          then 1.00
              when 'regel'         then 1.00
              when 'datum'         then 1.00
              when 'status'        then 1.00
              when 'cijfer'        then 0.90
              when 'prijs'         then 0.90
              when 'specificatie'  then 0.90
              when 'berekening'    then 0.80
              when 'interpretatie' then 0.70
            end)
      );
  end if;

  -- Een interpretatie kan nooit de soort 'feit' hebben.
  if not exists (select 1 from pg_constraint
                  where conname = 'uitspraken_interpretatie_niet_als_feit'
                    and conrelid = 'intel.uitspraken'::regclass) then
    alter table intel.uitspraken add constraint uitspraken_interpretatie_niet_als_feit
      check (not is_interpretatie or soort in ('berekening', 'interpretatie'));
  end if;
end $$;

-- ============================================================
-- 4. VIER OGEN EN EEN BINDENDE GOEDKEURING
-- ------------------------------------------------------------
-- Twee aparte problemen:
--  a) wie schrijft mag niet wie goedkeurt zijn;
--  b) goedkeuren en daarna de tekst wijzigen maakt de goedkeuring
--     waardeloos. Daarom bindt de goedkeuring aan een afdruk van de
--     inhoud; wijzigt de inhoud, dan klopt de afdruk niet meer.
-- ============================================================

alter table intel.inhoud_versies
  add column if not exists inhoud_afdruk text,
  add column if not exists goedgekeurde_afdruk text,
  add column if not exists bewerkt_door bigint references intel.gebruikers(id) on delete set null,
  add column if not exists goedgekeurd_door bigint references intel.gebruikers(id) on delete set null,
  add column if not exists goedgekeurd_op timestamptz,
  add column if not exists blokkades text[] not null default '{}';

comment on column intel.inhoud_versies.inhoud_afdruk is
  'sha256 over titel + direct_antwoord + body_markdown + structured_data. Verandert zodra de tekst verandert.';
comment on column intel.inhoud_versies.goedgekeurde_afdruk is
  'De afdruk zoals die was op het moment van goedkeuren. Moet gelijk zijn aan inhoud_afdruk om te mogen publiceren.';
comment on column intel.inhoud_versies.blokkades is
  'Redenen waarom deze versie niet mag publiceren. Status afgewezen vereist een niet-lege lijst.';

create index if not exists inhoud_versies_bewerkt_door_idx on intel.inhoud_versies (bewerkt_door);
create index if not exists inhoud_versies_goedgekeurd_door_idx on intel.inhoud_versies (goedgekeurd_door);

do $$
begin
  -- Vier ogen: de goedkeurder is noch de auteur noch de laatste bewerker.
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_vier_ogen'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_vier_ogen
      check (
        goedgekeurd_door is null
        or (goedgekeurd_door is distinct from aangemaakt_door
            and goedgekeurd_door is distinct from bewerkt_door)
      );
  end if;

  -- Goedkeuring bindt aan de afdruk.
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_goedkeuring_bindt'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_goedkeuring_bindt
      check (
        status not in ('goedgekeurd', 'gepubliceerd')
        or (goedgekeurde_afdruk is not null
            and inhoud_afdruk is not null
            and goedgekeurde_afdruk = inhoud_afdruk)
      );
  end if;

  -- Goedgekeurd of gepubliceerd vereist een menselijke goedkeurder.
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_goedkeuring_heeft_mens'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_goedkeuring_heeft_mens
      check (status not in ('goedgekeurd', 'gepubliceerd') or goedgekeurd_door is not null);
  end if;

  -- Publiceren vereist geslaagde poorten en geen blokkades.
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_publicatie_vereist_poorten'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_publicatie_vereist_poorten
      check (status <> 'gepubliceerd' or (poorten_geslaagd and cardinality(blokkades) = 0));
  end if;

  -- Afgewezen vereist een reden.
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_afwijzing_heeft_reden'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_afwijzing_heeft_reden
      check (status <> 'afgewezen' or cardinality(blokkades) > 0);
  end if;
end $$;

-- ============================================================
-- 5. DE GSC-CONTRACTFOUT HERSTELLEN
-- ------------------------------------------------------------
-- Gemeten in het zusterplatform tegen de echte export:
--   * sum_position is NUL-gebaseerd en de formule van Google is
--     SUM(sum_position)/SUM(impressions) + 1;
--   * een gemiddelde van gemiddelden is fout zodra dagen een
--     verschillend aantal vertoningen hebben;
--   * de export bevat alleen rijen met >= 1 vertoning, dus een
--     ontbrekende rij is geen nul.
-- Daarom: teller en noemer apart opslaan, nooit een voorgerekend
-- gemiddelde, en impressies >= 1 afdwingen.
-- ============================================================

alter table intel.zoekvraag_metingen
  add column if not exists positie_som numeric,
  add column if not exists epoch_versie integer not null default 0;

comment on column intel.zoekvraag_metingen.positie_som is
  'De teller: som van de nul-gebaseerde posities. Het gemiddelde hoort pas in de view berekend te worden.';
comment on column intel.zoekvraag_metingen.gemiddelde_positie is
  'VEROUDERD voor aggregatie. Alleen bruikbaar als de bron geen teller levert; aggregeer er nooit over.';
comment on column intel.zoekvraag_metingen.epoch_versie is
  'Google kan een dag herverwerken. Een hogere epoch vervangt de dag; dit is de enige juiste hertriggering.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'zoekvraag_metingen_impressies_minimaal_een'
                    and conrelid = 'intel.zoekvraag_metingen'::regclass) then
    alter table intel.zoekvraag_metingen add constraint zoekvraag_metingen_impressies_minimaal_een
      check (impressies is null or impressies >= 1);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'zoekvraag_metingen_kliks_niet_boven_impressies'
                    and conrelid = 'intel.zoekvraag_metingen'::regclass) then
    alter table intel.zoekvraag_metingen add constraint zoekvraag_metingen_kliks_niet_boven_impressies
      check (kliks is null or impressies is null or kliks <= impressies);
  end if;
end $$;

-- De enige juiste manier om positie te aggregeren.
create or replace view intel.zoekvraag_per_vraag as
  select organisatie_id,
         bron,
         zoekvraag,
         min(datum)                        as vanaf,
         max(datum)                        as tot,
         sum(impressies)                   as impressies,
         sum(kliks)                        as kliks,
         case when sum(impressies) > 0
              then sum(kliks)::numeric / sum(impressies)
         end                               as ctr,
         -- Nul-gebaseerde teller, dus +1 om bij positie 1 uit te komen.
         case when sum(impressies) > 0 and sum(positie_som) is not null
              then sum(positie_som) / sum(impressies) + 1
         end                               as gemiddelde_positie,
         count(*)                          as dagen_met_data
    from intel.zoekvraag_metingen
   group by organisatie_id, bron, zoekvraag;

comment on view intel.zoekvraag_per_vraag is
  'gemiddelde_positie = SUM(positie_som)/SUM(impressies) + 1. Nooit avg(gemiddelde_positie) gebruiken.';

grant select on intel.zoekvraag_per_vraag to vibe_intel_app, vibe_intel_lezer;

-- ============================================================
-- 6. DE VERTROUWENSKLINK OP KOPPELINGEN
-- ------------------------------------------------------------
-- 'De data mag bestaan, maar hij is nog niet te VERTROUWEN.' Een
-- koppeling die data levert maar nooit tegen de echte API gevalideerd
-- is, mag niet als cijfer in het dashboard verschijnen. Het dashboard
-- toont dan "wacht op validatie", niet nul.
-- ============================================================

alter table intel.koppelingen
  add column if not exists vertrouwd boolean not null default false,
  add column if not exists gevalideerd_op date,
  add column if not exists validatie_bewijs text;

comment on column intel.koppelingen.vertrouwd is
  'Alleen true na een validatie tegen de echte API, met bewijs. Geen featurevlag: het gaat over vertrouwen in de data.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'koppelingen_vertrouwd_vereist_validatie'
                    and conrelid = 'intel.koppelingen'::regclass) then
    alter table intel.koppelingen add constraint koppelingen_vertrouwd_vereist_validatie
      check (not vertrouwd or (gevalideerd_op is not null and validatie_bewijs is not null));
  end if;
end $$;

-- ============================================================
-- 7. AANVULLENDE INVARIANTEN
-- ============================================================

create or replace function intel_priv.controleer_inhoudsinvarianten()
returns table (soort text, onderwerp text, bevinding text)
language sql
stable
set search_path = ''
as $$
  -- Gepubliceerde inhoud zonder enige bewijsbinding.
  select 'inhoud_zonder_bewijs', v.pad,
         'versie ' || v.id || ' is gepubliceerd zonder enige gebonden uitspraak'
    from intel.inhoud_versies v
   where v.status = 'gepubliceerd'
     and not exists (select 1 from intel.inhoud_uitspraken iu where iu.inhoud_versie_id = v.id)

  union all
  -- Gepubliceerde inhoud die leunt op een niet-bevestigde uitspraak.
  select 'kernclaim_onbevestigd', v.pad,
         'versie ' || v.id || ' publiceert kernclaim ' || u.id || ' met status ' || u.verificatie_status
    from intel.inhoud_versies v
    join intel.inhoud_uitspraken iu on iu.inhoud_versie_id = v.id and iu.rol = 'kern'
    join intel.uitspraken u on u.id = iu.uitspraak_id
   where v.status = 'gepubliceerd'
     and u.verificatie_status <> 'bevestigd'

  union all
  -- Inhoud afgeleid van een bronversie waarin promptinjectie is gezien,
  -- zonder menselijke goedkeuring.
  select 'injectiebron_zonder_mens', v.pad,
         'versie ' || v.id || ' komt uit een bronversie met injectieverdenking en heeft geen menselijke goedkeuring'
    from intel.inhoud_versies v
   where v.status in ('goedgekeurd', 'gepubliceerd')
     and v.goedgekeurd_door is null
     and exists (
       select 1 from intel.brondocument_versies bv
        where bv.injectie_verdacht
          and bv.id = any(v.invoer_versies)
     )

  union all
  -- Een uitspraak die verlopen is maar nog in gepubliceerde inhoud zit.
  select 'verlopen_claim_live', v.pad,
         'versie ' || v.id || ' publiceert uitspraak ' || u.id || ' die op ' || u.geldig_tot || ' verliep'
    from intel.inhoud_versies v
    join intel.inhoud_uitspraken iu on iu.inhoud_versie_id = v.id
    join intel.uitspraken u on u.id = iu.uitspraak_id
   where v.status = 'gepubliceerd'
     and u.geldig_tot is not null
     and u.geldig_tot < current_date
$$;

comment on function intel_priv.controleer_inhoudsinvarianten() is
  'Inhoudelijke bewijsplicht na publicatie. Geen rijen = elke gepubliceerde kernclaim staat op bevestigd bewijs.';

revoke all on function intel_priv.controleer_inhoudsinvarianten() from public;
grant execute on function intel_priv.controleer_inhoudsinvarianten()
  to vibe_intel_app, vibe_intel_lezer;

set local lock_timeout = default;
set local statement_timeout = default;
