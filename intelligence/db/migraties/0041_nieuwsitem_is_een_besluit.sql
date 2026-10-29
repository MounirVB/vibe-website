-- ============================================================
-- 0041 — EEN NIEUWSBERICHT IS EEN EIGEN BESLUIT
-- ------------------------------------------------------------
-- WAT ER GEMETEN IS, EN WAAROM DIT DE KERN VAN RELEASE R2 IS.
--
-- Het nieuwskanaal staat sinds Release 2.1 volledig klaar: de
-- toestandsmachine (weigerNieuws), de generator, poort 16, de QA en de
-- schrijvende adapter. Toch zijn er nul artikelen. Dat is tot nu toe
-- gelezen als een redactionele keuze — "publiceren vraagt een
-- menselijke goedkeuring die in deze release niet is gegeven".
--
-- Dat is niet wat er aan de hand is. Gemeten op b2de0c4, over 144
-- echte kandidaten uit 2.171 brondocumenten:
--
--   besluit NEW_ARTICLE      0
--   besluit UPDATE_EXISTING 19
--   besluit SALES_SIGNAL     7
--   besluit MONITOR        118
--
-- Er was nooit iets om goed te keuren. De oorzaak is een structurele
-- uitsluiting tussen twee regels die elk afzonderlijk juist zijn:
--
--   besluit/motor.ts regel 251  NEW_ARTICLE kan ALLEEN als geen enkele
--                               pagina het cluster bezit. Bezit er wel
--                               een pagina de zoekintentie, dan is het
--                               UPDATE_EXISTING — "de belangrijkste
--                               regel van de hele motor".
--
--   bouw-routes.mjs regel 460   weigerNieuws() EIST een
--                               onderwerp_eigenaar die op INDEX staat.
--                               Zonder eigenaar: PENDING.
--
-- Gemeten: 12 van de 15 clusters hebben een canonieke pagina die in
-- het pagina-register staat, dus daar is NEW_ARTICLE onbereikbaar. De
-- drie clusters zonder eigenaar (aanbesteding, statistiek, vergunning)
-- hebben geen enkele regel in CLUSTER_NAAR_ROUTE, dus daar weigert
-- publiceerViaRegister() met "geen onderwerp-eigenaar te bepalen".
-- De twee verzamelingen zijn disjunct. Een nieuwsbericht kon dus niet
-- bestaan, hoe goed de bronnen ook waren.
--
-- WAAROM DAT GEEN FOUT IN EEN VAN DIE TWEE REGELS IS.
-- Ze gaan over VERSCHILLENDE DINGEN, en dat is pas zichtbaar als je ze
-- naast elkaar legt. `NEW_ARTICLE` betekent: een nieuwe pagina die een
-- commerciële zoekintentie claimt. Daar is "er bestaat al een pagina
-- voor" een volkomen terechte afwijzing — anders kannibaliseert de
-- site zichzelf.
--
-- Een nieuwsbericht claimt die intentie juist NIET. Het contract zegt
-- het zelf, in data/seo/nieuws-architectuur.json, artikelschema,
-- onderwerp_eigenaar:
--
--   "Een nieuwsartikel bezit NOOIT zelf een commerciële zoekintentie;
--    het leent die van zijn eigenaar en linkt ernaartoe."
--
-- Een nieuwsbericht heeft een eigenaar dus NODIG. Het is het spiegelbeeld
-- van NEW_ARTICLE: waar die een eigenaar uitsluit, vereist dit er een.
-- Daarom is dit een eigen besluit en geen versoepeling van een bestaand
-- besluit.
--
-- WAT DIT NIET DOET, EN DAT IS DE BELANGRIJKSTE ALINEA.
--   * Geen enkele publicatiepoort wordt versoepeld. weigerNieuws()
--     houdt al zijn weiggronden; deze migratie raakt dat bestand niet.
--   * GOEDGEKEURD blijft een menselijke handeling met naam en datum.
--     Een NEWS_ITEM-kandidaat levert een inhoudsversie op status
--     'ter_review' — precies zoals elke andere conceptroute.
--   * De vier-ogenregel, de afdrukbinding en het append-only
--     besluitenlogboek blijven onaangeroerd.
--   * Er wordt geen artikel verzonnen om het kanaal te vullen. Gemeten:
--     van de 20 gebeurtenissen die alle inhoudelijke drempels halen,
--     dragen er 2 een DRAGENDE bronsoort langs de join die
--     publiceerViaRegister() gebruikt. Twee is dus de eerlijke oogst van
--     vandaag, niet tien.
--   * UPDATE_EXISTING verdwijnt niet en verandert niet. De nieuwspas
--     schrijft onder een EIGEN motor_versie, dus de 19 bestaande
--     paginavoorstellen blijven staan zoals ze zijn. Dezelfde
--     gebeurtenis kan dus zowel een paginaverbetering als een
--     nieuwsbericht opleveren, en dat is juist: het ene verbetert de
--     uitleg, het andere meldt dat er iets is gebeurd.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- Het besluit zelf.
--
-- VALID EN NIET `NOT VALID`, en dat is een meting en geen gok. Deze
-- wijziging VERRUIMT de toegestane verzameling van acht naar negen
-- waarden. Een verruiming kan per definitie geen bestaande rij afkeuren:
-- elke rij die de oude lijst haalde, haalt de nieuwe ook. Gemeten:
-- 144 rijen, alle met een besluit uit de oude acht. Migratie 0027 ging
-- juist mis op het omgekeerde geval — een CHECK die strenger werd.

alter table intel.inhoud_kandidaten
  drop constraint if exists inhoud_kandidaten_besluit_check;

alter table intel.inhoud_kandidaten
  add constraint inhoud_kandidaten_besluit_check check (
    besluit in (
      'NEW_ARTICLE',
      'UPDATE_EXISTING',
      'REGIONAL_PATCH',
      'KNOWLEDGE_UPDATE',
      'SALES_SIGNAL',
      'DISTRIBUTION_ONLY',
      'MONITOR',
      'REJECT',
      -- NIEUW IN R2.
      'NEWS_ITEM'
    )
  );

-- ---------------------------------------------------------------- 2
-- De nieuwsscore, sorteerbaar.
--
-- WAAROM EEN KOLOM NAAST `beoordeling`. De volledige, uitlegbare
-- grondslag (drie assen, elk met hun componenten en hun bewijs) gaat in
-- `beoordeling` jsonb; daar hoort hij, want hij is genest en wordt
-- alleen gelezen als een mens één kandidaat openslaat.
--
-- Maar het redactionele dashboard moet "de tien belangrijkste
-- onderwerpen" kunnen tonen, en dat is een ORDER BY over duizenden
-- rijen. Dat uit jsonb trekken betekent een expressie-index op een
-- veldpad dat bij elke wijziging van de scorevorm stilzwijgend ophoudt
-- te werken. Een smallint met een eigen index zegt wat hij is en blijft
-- werken.
--
-- null betekent NIET NUL maar NIET BEOORDEELD. Dat onderscheid is de
-- hele reden dat deze kolom nullable is: een kandidaat van vóór deze
-- migratie heeft geen nieuwsoordeel, en die mag niet onderaan een
-- ranglijst opduiken alsof hij is afgewezen. Zie ook de les uit 0009:
-- "Een ontbrekende rij is geen nul."

alter table intel.inhoud_kandidaten
  add column if not exists nieuwsscore smallint
    constraint inhoud_kandidaten_nieuwsscore_bereik
      check (nieuwsscore is null or (nieuwsscore >= 0 and nieuwsscore <= 100));

comment on column intel.inhoud_kandidaten.nieuwsscore is
  'DE NIEUWSWAARDE 0-100, samengesteld uit drie assen: zakelijke relevantie, SEO/GEO en '
  'bronkwaliteit. null = NIET BEOORDEELD (geen nieuwspas gedraaid), en dat is iets anders dan 0 '
  '= beoordeeld en waardeloos. De componenten en hun bewijs staan in beoordeling->''nieuws''. '
  'Deze score stuurt UITSLUITEND de prioritering; of er een bericht mag komen beslissen de '
  'poorten in inhoud/poorten.ts en weigerNieuws() in scripts/seo/bouw-routes.mjs.';

-- ---------------------------------------------------------------- 3
-- Het oordeel in woorden, naast het getal.
--
-- Een score van 40 zegt niet of die kandidaat is afgewezen omdat hij
-- geen dragende bron heeft of omdat het onderwerp buiten de propositie
-- valt. Dat verschil bepaalt wat een redacteur ermee doet: het eerste
-- wacht op een betere bron, het tweede komt nooit meer terug. Daarom de
-- reden apart, en kort genoeg om in een tabelrij te passen.

alter table intel.inhoud_kandidaten
  add column if not exists nieuws_oordeel text
    constraint inhoud_kandidaten_nieuws_oordeel_kort
      check (nieuws_oordeel is null or length(nieuws_oordeel) <= 300);

comment on column intel.inhoud_kandidaten.nieuws_oordeel is
  'EEN REGEL DIE EEN MENS KAN NAVERTELLEN over waarom deze kandidaat wel of geen nieuwsbericht '
  'is. Bij afwijzing staat de BINDENDE grond vooraan, zodat zichtbaar is of er op een betere '
  'bron gewacht moet worden of dat het onderwerp buiten de propositie valt.';

-- ---------------------------------------------------------------- 4
-- De index die het dashboard bedient.
--
-- Partieel op `nieuwsscore is not null`: de onbeoordeelde kandidaten
-- horen niet in deze index, want geen enkele ranglijst vraagt ernaar.
-- Gemeten: 144 rijen nu, waarvan 0 beoordeeld, dus de index begint leeg
-- en groeit met de nieuwspas mee.

create index if not exists inhoud_kandidaten_nieuwsscore_idx
  on intel.inhoud_kandidaten (organisatie_id, nieuwsscore desc, id)
  where nieuwsscore is not null;

-- ---------------------------------------------------------------- 5
-- Rechten: niets te doen, en dat is gecontroleerd en niet aangenomen.
--
-- Gemeten op deze tabel: vibe_intel_app heeft INSERT, SELECT, UPDATE op
-- TABELniveau en vibe_intel_lezer heeft SELECT. Er zijn geen
-- kolomgrants, dus beide nieuwe kolommen erven de tabelgrant. Een
-- expliciete grant hier zou een kolomgrant introduceren waar er nu geen
-- is, en dat maakt het rechtenbeeld juist onduidelijker.
--
-- Er is geen nieuwe functie, dus ook niets terug te nemen van PUBLIC —
-- de regel uit docs/ARCHITECTUUR.md §5 ("geen gratis functierechten")
-- heeft hier geen werk.
