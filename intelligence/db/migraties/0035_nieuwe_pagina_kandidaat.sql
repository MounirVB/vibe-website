-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0035 het nieuwe-paginavoorstel
-- ------------------------------------------------------------
-- WAAROM:       De besluitmotor kende maar één antwoord op "geen
--               bestaande pagina dekt dit onderwerp": HERROUTEREN, wat
--               "hoort op een andere pagina" betekent. Is er geen
--               andere pagina, dan is dat een doodlopend antwoord.
--
--               Gemeten op 13 oktober 2026 (npm run dekkingsmeting):
--               van 19 kandidaten met een doelpagina bleven er 12 over
--               waarvoor ook de volledige dekkingstermenset nul gaf.
--               Negen gaan over NETTARIEVEN en werden naar
--               /kennis/transportvermogen-versus-aansluitwaarde geduwd,
--               een pagina die geen tariefstelsel behandelt. Drie gaan
--               over ENERGIEWETGEVING en werden naar
--               /kennis/normen-en-keuringen geduwd, dat over keuringen
--               gaat. Dat zijn onderwerpen waarvoor de site geen pagina
--               heeft.
--
-- WAT DIT DOET: 1 het eindoordeel NIEUWE_PAGINA toelaten
--               2 de staat NEW_PAGE_CANDIDATE toelaten
--               3 een jsonb-kolom voor het voorstel zelf
--               4 de goedkeurgrendel verruimen, zodat een mens er een
--                 besluit OVER kan nemen
--
-- WAT DIT NIET DOET: geen pagina aanmaken, geen route registreren, geen
--               bestand schrijven. Een NEW_PAGE_CANDIDATE is een
--               voorstel dat op een mens wacht, net als elk ander
--               voorstel. De publicatieketen blijft ongewijzigd en
--               publiceren blijft een menselijke handeling.
--
-- TERUGDRAAIEN: de drie constraints terugzetten naar hun vorm uit 0032
--               en `nieuwe_pagina` droppen. De kolom is nullable en
--               additief, dus terugdraaien kost geen data behalve de
--               voorstellen zelf.
-- ============================================================

-- ---------------------------------------------------------------- 1
alter table intel.inhoud_voorstellen
  drop constraint if exists inhoud_voorstellen_eindoordeel_check;
alter table intel.inhoud_voorstellen
  add constraint inhoud_voorstellen_eindoordeel_check check (eindoordeel in (
    'KLAAR_VOOR_REVIEW', 'KLAAR_VOOR_LINKREVIEW', 'NIEUWE_PAGINA',
    'NEEDS_RESEARCH', 'HERROUTEREN', 'UITSTELLEN', 'AFWIJZEN'));

-- ---------------------------------------------------------------- 2
alter table intel.inhoud_voorstellen
  drop constraint if exists voorstellen_publicatie_status_geldig;
alter table intel.inhoud_voorstellen
  add constraint voorstellen_publicatie_status_geldig check (
    publicatie_status in (
      'DRAFT',
      'READY_FOR_REVIEW',
      'READY_FOR_LINK_REVIEW',
      'NEW_PAGE_CANDIDATE',
      'APPROVED',
      'PUBLICATION_PRECHECK',
      'DEPLOYMENT',
      'LIVE_VERIFIED',
      'REJECTED'));

-- ---------------------------------------------------------------- 3
-- Het voorstel zelf. jsonb omdat de velden van par. 12 een samenhangend
-- geheel zijn dat alleen als geheel betekenis heeft, en omdat een mens
-- ze beoordeelt in plaats van dat de database erop filtert.
alter table intel.inhoud_voorstellen
  add column if not exists nieuwe_pagina jsonb;

alter table intel.inhoud_voorstellen
  drop constraint if exists voorstellen_nieuwe_pagina_bij_oordeel;
-- De kolom en het eindoordeel horen bij elkaar: een NIEUWE_PAGINA
-- zonder voorstel is leeg, en een voorstel bij een ander eindoordeel is
-- misleidend. Beide kanten dus.
alter table intel.inhoud_voorstellen
  add constraint voorstellen_nieuwe_pagina_bij_oordeel check (
    (eindoordeel = 'NIEUWE_PAGINA') = (nieuwe_pagina is not null));

-- De groeperingssleutel moet erin zitten, anders kan de studio negen
-- ontdekkingen over hetzelfde onderwerp niet tot één besluit bundelen —
-- en dat is precies wat par. 19 verbiedt.
alter table intel.inhoud_voorstellen
  drop constraint if exists voorstellen_nieuwe_pagina_heeft_slug;
alter table intel.inhoud_voorstellen
  add constraint voorstellen_nieuwe_pagina_heeft_slug check (
    nieuwe_pagina is null
    or (nieuwe_pagina ? 'slug' and length(nieuwe_pagina->>'slug') between 3 and 120));

create index if not exists voorstellen_nieuwe_pagina_slug_idx
  on intel.inhoud_voorstellen ((nieuwe_pagina->>'slug'))
  where nieuwe_pagina is not null;

comment on column intel.inhoud_voorstellen.nieuwe_pagina is
  'Het voorstel voor een NIEUWE pagina, als eindoordeel NIEUWE_PAGINA is. Bevat de velden van '
  'par. 12: slug, soort, werktitel, hoofdonderwerp, fenomeen, zoekintentie, doelgroep, '
  'voorgesteldeStructuur, naastgelegenPaginas, waaromGeenBestaandePagina, duplicaatrisico. '
  'De slug is de GROEPERINGSSLEUTEL: meerdere ontdekkingen over hetzelfde onderwerp komen op '
  'dezelfde slug uit en horen als EEN redactioneel besluit te worden getoond, met hun bewijzen '
  'eronder. Dit is nooit een gepubliceerde pagina.';

-- ---------------------------------------------------------------- 4
-- Zonder deze verruiming is NEW_PAGE_CANDIDATE een doodlopende weg: de
-- grendel uit 0021 eist dat een GOEDGEKEURD voorstel een
-- review-eindoordeel heeft, en dan kan niemand ooit over een
-- paginavoorstel besluiten. Dezelfde val als bij het linkvoorstel in
-- 0032.
alter table intel.inhoud_voorstellen
  drop constraint if exists voorstel_alleen_review_goedkeuren;
alter table intel.inhoud_voorstellen
  add constraint voorstel_alleen_review_goedkeuren check (
    beoordeling <> 'GOEDGEKEURD'
    or eindoordeel in ('KLAAR_VOOR_REVIEW', 'KLAAR_VOOR_LINKREVIEW', 'NIEUWE_PAGINA'));

comment on constraint voorstel_alleen_review_goedkeuren on intel.inhoud_voorstellen is
  'Een afgewezen of te herrouteren voorstel kan niet worden goedgekeurd; anders is de '
  'controlelaag decoratie. Sinds 0035 laat hij ook NIEUWE_PAGINA door: goedkeuren betekent daar '
  '"deze pagina mag gemaakt worden", en het maken blijft mensenwerk via de beschermde '
  'git-werkstroom.';
