-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0052 goedkeuring door beleid
-- ------------------------------------------------------------
-- WAAROM:       Automatische publicatie was tot nu toe niet een
--               schakelaar die uit stond, maar een pad dat NIET
--               BESTOND. intel.publicatiebeleid draagt sinds 0004 de
--               velden auto_publiceren_aan, auto_max_risico,
--               auto_toegestane_soorten, auto_min_bronnen en
--               auto_min_bewijskwaliteit, en gemeten op 5 november 2026
--               wordt daar op precies twee plaatsen naar gekeken: het
--               dashboard (weergave) en cli/e2e.ts (die toetst DAT geen
--               beleidsregel hoog risico toestaat). Geen enkele van de
--               zeventien plannertaken publiceert.
--
--               Het beleid was dus een intentieverklaring zonder
--               handhavingspunt. Deze migratie maakt de toestand die
--               een handhavingspunt nodig heeft.
--
-- ------------------------------------------------------------
-- DE GRENDEL DIE IN DE WEG STOND, EN WAAROM HIJ NIET WEGGAAT
--
-- `inhoud_versies_goedkeuring_heeft_mens` eist sinds 0009:
--
--     status not in ('goedgekeurd','gepubliceerd')
--       or goedgekeurd_door is not null
--
-- met in de migratie de letterlijke toelichting "Goedgekeurd of
-- gepubliceerd vereist een MENSELIJKE goedkeurder." `goedgekeurd_door`
-- verwijst naar intel.gebruikers.
--
-- Er was dus één manier om automatisch te publiceren zonder deze
-- constraint aan te raken: een gebruikersrij aanmaken die 'het systeem'
-- heet en daarnaar verwijzen. DAT IS NIET GEDAAN, en de reden is het
-- hele punt van deze migratie. Een machine die in de audit als
-- gebruiker staat, maakt elke latere lezing van `goedgekeurd_door is
-- not null` onbetrouwbaar: wie dat veld ziet, concludeert dat een mens
-- heeft gekeken. Dan is de grendel formeel intact en inhoudelijk weg.
--
-- In plaats daarvan wordt de automatische goedkeuring een EIGEN,
-- BENOEMDE toestand. `goedgekeurd_door` blijft dan NULL — wat waar is,
-- want er was geen mens — en `goedkeuring_soort` zegt wat er dan wel
-- gebeurde. Een lezer die wil weten of een mens keek, kijkt naar
-- `goedkeuring_soort = 'mens'` en krijgt het eerlijke antwoord.
--
-- ------------------------------------------------------------
-- WAT ONVERANDERD BLIJFT, en dat is het meeste
--
--   vier ogen            `inhoud_versies_vier_ogen` blijft staan. Hij
--                        toetst `goedgekeurd_door is null or (...)`, dus
--                        een beleidsgoedkeuring met NULL glijdt er
--                        legitiem door — en voor de menselijke route
--                        geldt hij onverminderd.
--   afdrukbinding        `inhoud_versies_goedkeuring_bindt` blijft: ook
--                        een beleidsgoedkeuring moet de goedgekeurde
--                        afdruk gelijk hebben aan de huidige inhoud.
--                        Tekst wijzigen na goedkeuring blijft publiceren
--                        onmogelijk maken.
--   poorten              `inhoud_versies_publicatie_vereist_poorten`
--                        blijft: gepubliceerd eist poorten_geslaagd en
--                        nul blokkades.
--   hoog risico          `publicatiebeleid_hoog_risico_nooit_automatisch`
--                        blijft, EN komt er in deze migratie een tweede
--                        slot bij op de versierij zelf. Twee sloten op
--                        hetzelfde, op twee niveaus, want dit is de
--                        regel die onder geen enkele configuratie mag
--                        wijken.
--
-- ------------------------------------------------------------
-- IDEMPOTENT:   JA. add column if not exists, en de constraintwissel
--               staat in een do-blok dat op pg_constraint toetst.
-- DESTRUCTIEF:  NEE. Geen kolom verdwijnt, geen rij wordt gewijzigd.
--               De vervangen constraint wordt RUIMER, niet strenger:
--               elke rij die onder de oude paste past onder de nieuwe
--               (bestaande rijen krijgen goedkeuring_soort 'mens' uit
--               de default, en voor die waarde is de nieuwe eis
--               identiek aan de oude).
-- ROLLBACK:     alter table intel.inhoud_versies
--                 drop constraint if exists inhoud_versies_goedkeuring_herkomst,
--                 drop constraint if exists inhoud_versies_beleid_nooit_hoog_risico,
--                 drop column if exists goedkeurend_beleid,
--                 drop column if exists goedkeuring_soort;
--               alter table intel.inhoud_versies add constraint
--                 inhoud_versies_goedkeuring_heeft_mens
--                 check (status not in ('goedgekeurd','gepubliceerd')
--                        or goedgekeurd_door is not null);
--               LET OP: die laatste botst op elke rij die inmiddels door
--               beleid is goedgekeurd. Draai eerst
--                 update intel.inhoud_versies set status = 'ter_review'
--                  where goedkeuring_soort = 'beleid';
-- ============================================================

set local lock_timeout = '5s';

alter table intel.inhoud_versies
  add column if not exists goedkeuring_soort text not null default 'mens',
  add column if not exists goedkeurend_beleid text;

comment on column intel.inhoud_versies.goedkeuring_soort is
  'Wie heeft goedgekeurd: ''mens'' (goedgekeurd_door is gevuld) of ''beleid'' (automatisch, goedgekeurd_door blijft NULL). Nooit een gebruikersrij voor een machine: dan leest goedgekeurd_door als een mens die keek.';

comment on column intel.inhoud_versies.goedkeurend_beleid is
  'De versie van intel.publicatiebeleid die deze automatische goedkeuring toestond. Verplicht bij goedkeuring_soort = ''beleid'', zodat na te rekenen is ONDER WELKE REGELS er is gepubliceerd.';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_goedkeuring_soort_bekend'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_goedkeuring_soort_bekend
      check (goedkeuring_soort in ('mens', 'beleid'));
  end if;

  /* DE HERKOMSTEIS. Vervangt ..._heeft_mens en zegt hetzelfde voor de
     menselijke route, met een tweede route erbij die zichzelf benoemt. */
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_goedkeuring_herkomst'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_goedkeuring_herkomst
      check (
        status not in ('goedgekeurd', 'gepubliceerd')
        or (goedkeuring_soort = 'mens'   and goedgekeurd_door is not null)
        or (goedkeuring_soort = 'beleid' and goedgekeurd_door is null
                                         and goedkeurend_beleid is not null)
      );
  end if;

  /* HET TWEEDE SLOT OP HOOG RISICO, op de versierij zelf.

     Het beleid kan al niet op (auto aan + max hoog) staan. Dit slot
     dekt het geval dat iemand de versierij rechtstreeks aanraakt, of
     dat een beleidsregel wordt verruimd nadat een versie al door
     beleid is goedgekeurd. Hoog risico en goedkeuring_soort 'beleid'
     kunnen onder geen enkele configuratie samen bestaan. */
  if not exists (select 1 from pg_constraint
                  where conname = 'inhoud_versies_beleid_nooit_hoog_risico'
                    and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies add constraint inhoud_versies_beleid_nooit_hoog_risico
      check (goedkeuring_soort <> 'beleid' or risico_klasse <> 'hoog');
  end if;

  if exists (select 1 from pg_constraint
              where conname = 'inhoud_versies_goedkeuring_heeft_mens'
                and conrelid = 'intel.inhoud_versies'::regclass) then
    alter table intel.inhoud_versies drop constraint inhoud_versies_goedkeuring_heeft_mens;
  end if;
end $$;

-- ------------------------------------------------------------
-- De publicatie moet terug te leiden zijn naar het beleid dat hem
-- toestond. publicatiebesluiten.beleid_versie bestond al als kolom maar
-- werd nergens gevuld; dit commentaar maakt er een contract van.
-- ------------------------------------------------------------

comment on column intel.publicatiebesluiten.beleid_versie is
  'De versie van intel.publicatiebeleid waaronder dit besluit valt. VERPLICHT te vullen bij een automatisch besluit (actor_soort ''systeem'' of ''cron''), zodat achteraf vaststaat onder welke regels er is gepubliceerd.';

-- ------------------------------------------------------------
-- Een index op de werkvoorraad van de publicatietaak. Zonder deze
-- index scant die taak elke ronde de hele tabel; met tienduizenden
-- versies is dat de rem.
-- ------------------------------------------------------------

create index if not exists inhoud_versies_publicatiewachtrij_idx
  on intel.inhoud_versies (organisatie_id, status, risico_klasse)
  where status = 'goedgekeurd';
