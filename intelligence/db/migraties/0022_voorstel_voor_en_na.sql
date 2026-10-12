-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0022 voor/na en interne links
-- ------------------------------------------------------------
-- WAAROM:       Par. 8 eist dat een reviewer de BESTAANDE en de
--               VOORGESTELDE tekst naast elkaar ziet, en dat het
--               voorstel relevante interne links aanbeveelt. 0021 bewaarde
--               alleen de nieuwe tekst; daarmee kon een reviewer zien WAT
--               erbij komt maar niet WAARIN, en moest hij de pagina er
--               zelf naast openen.
--
--               De interne links komen uit het sitekennis-artefact:
--               pagina's die een onderwerp met de gebeurtenis delen en
--               waar de doelpagina nog niet naar wijst. Daarmee is de
--               aanbeveling navraagbaar in plaats van een losse mening.
--
-- WAT DIT DOET: additief, twee kolommen. Geen bestaande waarde wordt
--               herschreven en geen menselijk besluit aangeraakt.
--
-- TERUGDRAAIEN: alter table intel.inhoud_voorstellen
--                 drop column huidige_tekst, drop column interne_links;
-- ============================================================

begin;

alter table intel.inhoud_voorstellen
  add column if not exists huidige_tekst text,
  add column if not exists interne_links text[] not null default '{}';

comment on column intel.inhoud_voorstellen.huidige_tekst is
  'De tekst die NU op de doelsectie staat, als ''voor'' naast nieuwe_tekst. '
  'Komt uit het sitekennis-artefact, niet uit een losse bestandslezing: in de '
  'productiecontainer bestaat data/inhoud/ niet.';
comment on column intel.inhoud_voorstellen.interne_links is
  'Aanbevolen interne links met hun reden, afgeleid uit gedeelde onderwerpen in '
  'het sitekennis-artefact. Alleen pagina''s waar de doelpagina nog niet naar wijst.';

commit;
