-- ============================================================
-- 0045 — de documentvorm erbij, en twee soorten die het gat benoemen
-- ------------------------------------------------------------
-- WAT HIER FOUT WAS, gemeten op 31 oktober 2026 op de echte pagina en
-- niet vermoed.
--
-- Zodra `rijksoverheid-nieuws` volledige tekst ging leveren, kwam dit
-- eruit:
--
--   https://www.rijksoverheid.nl/actueel/nieuws/2026/10/29/
--     nieuwe-regels-voor-toeristische-verhuur-vanaf-1-november-2026
--
--   eerste regel van de pagina: "Nieuwsbericht 29-10-2026 | 10:14"
--   body: "Vanaf 1 november 2026 treedt de wijziging van de Wet
--          toeristische verhuur in werking."
--
--   -> OFFICIELE_REGELGEVING / BEVOEGD_GEZAG
--   -> bewijskrachtplafond 5, het hoogste dat bestaat
--   -> magZelfBevestigen = true
--
-- Een nieuwsbericht OVER een regel werd de regel ZELF, met het recht
-- zichzelf te bevestigen. Dat is de faalwijze waar R3 om begonnen is:
-- bewijskracht die van de uitgever komt in plaats van van een
-- vaststellend document.
--
-- V1 kon dit niet zien. Hij las twee assen — het GEZAG van de uitgever
-- en de FORMULERINGEN in de tekst — en voor deze vraag zijn die niet
-- genoeg: de authentieke regeling en het bericht erover gebruiken
-- dezelfde woorden, en het ministerie is in beide gevallen bevoegd.
-- Wat ze onderscheidt is de VORM, en die as ontbrak.
--
-- ------------------------------------------------------------
-- WAT DEZE MIGRATIE DOET
--
--   1 een kolom `documentvorm` op intel.brondocument_versies, met een
--     CHECK op de vijf vormen uit src/pijplijn/documentvorm.ts;
--   2 de CHECK op `documentsoort` uitgebreid met de twee nieuwe soorten
--     NIEUWSBERICHT_REGELGEVING en ONTWERPBESLUIT;
--   3 de inhoudsinvariant uit 0044 opnieuw gedefinieerd, met
--     ONTWERPBESLUIT in de lijst niet-dragende soorten.
--
-- GEEN DML. Geen rij wordt aangeraakt, geen oordeel herschreven, geen
-- claim bijgewerkt. De nieuwe kolom begint overal NULL en de verruimde
-- CHECK kan per definitie geen bestaande waarde afkeuren.
--
-- DE HERCLASSIFICATIE IS EEN APARTE HANDELING. `DOCUMENTSOORT_VERSIE`
-- gaat in dezelfde wijziging naar 'documentsoort-v2', en de taak
-- `documentclassificatie` haalt daarna alles op wat NULL is of een
-- andere versiestring draagt. Dat is werk van de planner, met een eigen
-- besluit per ronde — precies zoals fase C en D van de R3-release. Deze
-- migratie zet daar niets in beweging.
--
-- ------------------------------------------------------------
-- WAAROM PUNT 3 GEEN KEUZE IS
--
-- test/integratie/invariant-kernclaim-draagt.test.ts vergelijkt de
-- lijst in deze functie regel voor regel met
-- NIET_DRAGENDE_DOCUMENTSOORTEN uit documentsoort.ts. ONTWERPBESLUIT
-- aan de TypeScript-kant zetten zonder deze migratie maakt die toets
-- ROOD, en dat is precies wat hij moet doen: een invariant die minder
-- eist dan de poort ervoor is geen vangnet maar een valse bevestiging.
--
-- NIEUWSBERICHT_REGELGEVING staat met opzet NIET in die lijst. Die
-- soort kan maar langs één weg bevestigd worden — bronverificatie.ts
-- vindt het authentieke stuk bij het bevoegde gezag, met hetzelfde
-- getal, dezelfde eenheid, hetzelfde onderwerp en modaliteit
-- VASTGESTELD. Is die weg afgelegd, dan IS er een vaststellend
-- origineel gezien. De poort die zelfbevestiging uitsluit is het
-- plafond 3 in documentsoort.ts, want magZelfBevestigen() eist 4.
-- ============================================================

-- ------------------------------------------------------------
-- 1 · de vorm als eigen kolom
-- ------------------------------------------------------------
alter table intel.brondocument_versies
  add column if not exists documentvorm text;

alter table intel.brondocument_versies
  drop constraint if exists versies_documentvorm;
alter table intel.brondocument_versies
  add constraint versies_documentvorm check (
    documentvorm is null or documentvorm in (
      'BEKENDMAKING',
      'ONTWERP',
      'NIEUWSBERICHT',
      'PERSBERICHT',
      'ARTIKEL'));

comment on column intel.brondocument_versies.documentvorm is
  'WELKE VORM dit stuk heeft, los van wat erin staat: is het de authentieke '
  'bekendmaking, een ontwerp, een bericht erover, een persbericht, of niet vast te '
  'stellen. Bepaald door bepaalDocumentvorm() in src/pijplijn/documentvorm.ts uit '
  'STRUCTUURMARKERINGEN — "Nieuwsbericht 29-10-2026", "Gelet op artikel 5", "bezwaar '
  'binnen zes weken" — en niet uit de strekking. OFFICIEEL_BESLUIT en '
  'OFFICIELE_REGELGEVING eisen vorm BEKENDMAKING bovenop BEVOEGD_GEZAG; de vorm kan '
  'alleen BEPERKEN en nooit een gezagseis vervangen. NULL betekent: nog niet bepaald.';

-- ------------------------------------------------------------
-- 2 · twee soorten erbij
-- ------------------------------------------------------------
alter table intel.brondocument_versies
  drop constraint if exists versies_documentsoort;
alter table intel.brondocument_versies
  add constraint versies_documentsoort check (
    documentsoort is null or documentsoort in (
      'OFFICIEEL_BESLUIT',
      'OFFICIELE_REGELGEVING',
      'FEITELIJKE_MEDEDELING',
      'ONDERZOEKSRAPPORT',
      'SECTORANALYSE',
      -- NIEUW IN V2
      'NIEUWSBERICHT_REGELGEVING',
      'ONTWERPBESLUIT',
      'PERSBERICHT',
      'OPINIE',
      'LOBBYDOCUMENT',
      'SECUNDAIRE_BERICHTGEVING',
      'ONVOLDOENDE_VERIFIEERBAAR'));

comment on column intel.brondocument_versies.documentsoort is
  'Wat IS dit document: de twaalf soorten uit R3/v2, van OFFICIEEL_BESLUIT tot '
  'ONVOLDOENDE_VERIFIEERBAAR. Vastgesteld door bepaalDocumentsoort() in '
  'src/pijplijn/documentsoort.ts uit titel, tekst, URL, het gezag van de uitgever EN '
  'de documentvorm. NIEUWSBERICHT_REGELGEVING is het bevoegde gezag dat over een '
  'eigen regel bericht zonder het authentieke stuk te zijn (plafond 3, mag niet '
  'zelf bevestigen); ONTWERPBESLUIT is een ontwerp of consultatie (plafond 2, draagt '
  'niets). NULL betekent: nog niet geclassificeerd — niet FEITELIJKE_MEDEDELING.';

-- ------------------------------------------------------------
-- 3 · de invariant trekt mee
--
-- Letterlijk de functie uit 0044, met ONTWERPBESLUIT toegevoegd aan de
-- lijst niet-dragende soorten. De rest is onveranderd overgenomen; een
-- `create or replace` moet de hele functie opnieuw geven.
-- ------------------------------------------------------------
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
  -- Een BEVESTIGDE kernclaim die toch niets draagt (0044, bijgewerkt in 0045).
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
            'OPINIE', 'LOBBYDOCUMENT', 'ONTWERPBESLUIT',
            'SECUNDAIRE_BERICHTGEVING', 'ONVOLDOENDE_VERIFIEERBAAR'
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
  'kernclaim, een bevestigde kernclaim die onder de R3-regels niets draagt (0044, in '
  '0045 uitgebreid met ONTWERPBESLUIT), een injectieverdachte bron zonder menselijke '
  'goedkeuring, en een verlopen claim die nog live staat. Nul rijen is de enige '
  'goede uitslag.';

-- DEZELFDE RECHTEN ALS IN 0009 EN 0044, letterlijk overgenomen.
revoke all on function intel_priv.controleer_inhoudsinvarianten() from public;
grant execute on function intel_priv.controleer_inhoudsinvarianten()
  to vibe_intel_app, vibe_intel_lezer;
