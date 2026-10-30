-- ============================================================
-- 0044 — de invariant maakt waar wat het dashboard belooft
-- ------------------------------------------------------------
-- WAT HIER FOUT WAS. De instellingenpagina zet bij nul bevindingen een
-- groene tegel met de tekst "geen gepubliceerde kernclaim zonder
-- bevestigd bewijs". De invariant eronder,
-- intel_priv.controleer_inhoudsinvarianten() uit migratie 0009, toetste
-- daarvoor alleen:
--
--     u.verificatie_status <> 'bevestigd'
--
-- Dat was precies de regel die R3 ontmantelt. 'bevestigd' kwam onder de
-- oude regels van de betrouwbaarheid van de UITGEVER en zei niets over
-- het document of over de zin: 45 van de 51 bevestigde claims in
-- productie stonden op naam van één branchevereniging, met een
-- lobbyverzoek aan de Tweede Kamer ertussen. Een gepubliceerd artikel
-- dat daarop leunde had deze invariant glansrijk gehaald, en de groene
-- tegel had het bevestigd.
--
-- De poorten in de applicatie weigeren zo'n publicatie nu (poort 6
-- `kernclaim_heeft_bewijs`, en de claimpoort vóór goedkeuren en
-- publiceren). Deze migratie trekt de DATABASE-invariant mee, zodat de
-- laatste controle niet milder is dan de eerste. Een invariant die
-- minder eist dan de poort ervoor is geen vangnet maar een valse
-- bevestiging.
--
-- WAT DIT NIET DOET. Geen DML, geen destructieve DDL, geen kolom erbij.
-- Eén `create or replace function` en één bijgewerkte comment. De
-- functie is `stable` en `security invoker`, net als daarvoor.
--
-- WAAROM DIT GEEN BESTAANDE RIJ KAN BREKEN. Gemeten in productie op
-- 30 oktober 2026: intel.inhoud_versies 0 rijen,
-- intel.inhoud_uitspraken 0 rijen, intel.publicaties 0 rijen. Er is
-- geen gepubliceerde inhoud, dus deze strengere toets kan geen
-- bestaande bevinding opleveren. Hij geldt vanaf de eerste publicatie.
--
-- DE DREMPELWAARDEN STAAN HIER LETTERLIJK, en dat is een afweging. De
-- waarheid over 'draagt' staat in claimDraagt() in
-- src/pijplijn/claimpoort.ts; SQL kan die functie niet aanroepen. Twee
-- formuleringen van dezelfde vraag lopen uiteen, en dat is in dit
-- platform al eerder misgegaan. Daarom:
--   * de drempel 0.50 is NOODZAKELIJKE_ZEKERHEID uit claimmodaliteit.ts;
--   * de lijst niet-dragende soorten is NIET_DRAGENDE_DOCUMENTSOORTEN
--     uit documentsoort.ts;
--   * een eenheidstoets vergelijkt beide kanten, zodat een wijziging in
--     de TypeScript-constanten zonder migratie ROOD wordt in plaats van
--     stil uiteen te lopen. Zie
--     test/integratie/invariant-kernclaim-draagt.test.ts.
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
  -- NIEUW IN 0044 — een BEVESTIGDE kernclaim die toch niets draagt.
  -- Drie gronden, elk met een eigen fout erachter:
  --   1 de zin stelt niets vast (een voorstel of een verwachting);
  --   2 hij stelt wel iets vast maar met te lage zekerheid;
  --   3 het document stelt zelf niets vast -- een navertelling, een
  --     opiniestuk of een lobbydocument, of het is niet geclassificeerd.
  -- De documentsoort komt van de PRIMAIRE bronversie. Niet van een
  -- bevestigende of tegensprekende binding: dat is de versie waar de
  -- claim niet uit komt, en bij een tegensprekende binding zelfs de
  -- versie die hem weerspreekt.
  select 'kernclaim_draagt_niet', v.pad,
         'versie ' || v.id || ' publiceert kernclaim ' || u.id || ': ' ||
         case
           when u.modaliteit is null then 'de modaliteit is niet beoordeeld'
           when u.modaliteit <> 'VASTGESTELD'
             then 'de zin is een ' || lower(u.modaliteit) || ' en geen vaststelling'
           when coalesce(u.modaliteit_zekerheid, 0) < 0.50
             then 'vastgesteld met zekerheid ' ||
                  to_char(coalesce(u.modaliteit_zekerheid, 0), 'FM0.00') ||
                  ', onder de drempel 0.50'
           when bv.documentsoort is null then 'het brondocument is niet geclassificeerd'
           else 'het brondocument is ' || bv.documentsoort || ' en stelt zelf niets vast'
         end
    from intel.inhoud_versies v
    join intel.inhoud_uitspraken iu on iu.inhoud_versie_id = v.id and iu.rol = 'kern'
    join intel.uitspraken u on u.id = iu.uitspraak_id
    left join intel.uitspraak_bronnen ub
           on ub.uitspraak_id = u.id and ub.rol = 'primair'
    left join intel.brondocument_versies bv on bv.id = ub.versie_id
   where v.status = 'gepubliceerd'
     and u.verificatie_status = 'bevestigd'
     and (
       u.modaliteit is distinct from 'VASTGESTELD'
       or coalesce(u.modaliteit_zekerheid, 0) < 0.50
       or bv.documentsoort is null
       or bv.documentsoort in (
            'OPINIE', 'LOBBYDOCUMENT', 'SECUNDAIRE_BERICHTGEVING',
            'ONVOLDOENDE_VERIFIEERBAAR'
          )
     )

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
  'Inhoudsinvarianten: gepubliceerde inhoud zonder bewijsbinding, een onbevestigde '
  'kernclaim, een bevestigde kernclaim die onder de R3-regels niets draagt (0044), '
  'een injectieverdachte bron zonder menselijke goedkeuring, en een verlopen claim '
  'die nog live staat. Nul rijen is de enige goede uitslag.';

-- DEZELFDE RECHTEN ALS IN 0009, letterlijk overgenomen. `create or
-- replace function` behoudt bestaande grants, maar ze hier herhalen
-- maakt deze migratie zelfstandig leesbaar en voorkomt dat een latere
-- herdefinitie `vibe_intel_lezer` stil laat vallen.
revoke all on function intel_priv.controleer_inhoudsinvarianten() from public;
grant execute on function intel_priv.controleer_inhoudsinvarianten()
  to vibe_intel_app, vibe_intel_lezer;
