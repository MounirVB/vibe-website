-- ============================================================
-- 0040 — OPGEVEN IS EEN TOESTAND, GEEN AFWEZIGHEID
-- ------------------------------------------------------------
-- Issue #45. `herhaalbaar: false` stopte niets.
--
-- De verzendlus zette bij een definitieve fout `volgende_poging_op =
-- null`, en de selectie leest `volgende_poging_op is null` als "nu te
-- verzenden". Een niet-herhaalbare fout werd daardoor de volgende ronde
-- direct opnieuw aangeboden — zonder back-off, dus SNELLER dan een
-- herhaalbare fout — tot `pogingen` de grens raakte. Gemeten: zes
-- rondes op dezelfde klok gaven aangeboden 1,1,1,1,1,0, terwijl de
-- eerste ronde al `opgegeven 1` rapporteerde.
--
-- De oorzaak is dat `null` in die kolom twee dingen betekende: "er is
-- geen wachtmoment" en "er komt geen poging meer". Dat eerste is een
-- lege waarde, het tweede is een BESLUIT. Een besluit hoort opgeslagen
-- te worden, niet afgeleid uit een ontbrekende waarde.
--
-- WAAROM EEN EIGEN KOLOM EN NIET EEN VAN DE TWEE GOEDKOPERE TRUCS
--   * `pogingen = maxPogingen` meeschrijven overlaadt de pogingteller
--     met een tweede betekenis, en breekt zodra iemand `maxPogingen`
--     verhoogt: opgegeven berichten worden dan weer verzendbaar.
--   * `volgende_poging_op = 'infinity'` werkt, maar is een sentinel die
--     elke lezer moet kennen, en laat de tellers alsnog liegen.
-- Deze kolom zegt wat er bedoeld is, is leesbaar in het logboek, en
-- maakt de belofte in de kop van ops/meldmail.ts waar: "na de laatste
-- poging blijft het bericht staan met zijn laatste fout, en dan is het
-- aan een mens."
--
-- WAT DIT NIET DOET. Een opgegeven bericht wordt nooit meer aangeboden,
-- ook niet nadat de oorzaak is weggenomen. Dat is de bedoeling: een
-- definitieve afwijzing van de provider lost zich niet op door te
-- wachten. Verandert de storingstoestand inhoudelijk, dan levert dat
-- een andere vingerafdruk en dus een NIEUWE rij, en die gaat gewoon uit
-- — de unieke index meldberichten_eenmalig blijft daarin de grens.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- De kolom. Additief en nullable: null = nog in behandeling.

alter table intel.meld_berichten
  add column if not exists opgegeven_op timestamptz;

comment on column intel.meld_berichten.opgegeven_op is
  'WANNEER WIJ HEBBEN BESLOTEN DAT ER GEEN POGING MEER VOLGT. null = nog in behandeling. '
  'Gezet bij een definitieve afwijzing van de provider (een 4xx die zich niet oplost door te '
  'wachten) en bij het bereiken van de pogingengrens. NIET gezet bij een ONBEKENDE uitkomst: '
  'die weet niet of de mail is aangekomen en moet met dezelfde idempotentiesleutel opnieuw '
  'worden geprobeerd (zie ops/mail.ts, veld uitkomstBekend). Een rij met opgegeven_op wordt '
  'door de verzendselectie overgeslagen; de reden staat in laatste_fout.';

-- ---------------------------------------------------------------- 2
-- De keten, net als meldberichten_keten_klopt in 0039: opgeven kan pas
-- NA een aanbieding, en opgegeven sluit geaccepteerd uit.
--
-- NOT VALID, EN DAT IS GEEN SLORDIGHEID. Migratie 0027 heeft een
-- productiedeploy gesloopt door een CHECK toe te voegen die bestaande
-- rijen afkeurde, en test/integratie/migratieveiligheid.test.ts
-- repeteert historische rijen alleen voor intel.uitspraken —
-- intel.meld_berichten is daar in beide paden LEEG, dus de poort zou
-- een botsing hier niet zien. Gemeten op productie, 19 oktober 2026:
-- 11 rijen, alle met aangeboden_op gevuld en geaccepteerd_op gevuld,
-- dus nul rijen die deze regel zouden schenden. De constraint bindt
-- daarmee alles wat er vanaf nu bij komt, zonder de deploy te riskeren
-- op een aanname over de voorraad.

alter table intel.meld_berichten
  drop constraint if exists meldberichten_opgeven_klopt;

alter table intel.meld_berichten
  add constraint meldberichten_opgeven_klopt check (
    (opgegeven_op is null or aangeboden_op is not null)
    and not (opgegeven_op is not null and geaccepteerd_op is not null)
  ) not valid;

-- ---------------------------------------------------------------- 3
-- De index die de verzendselectie bedient.
--
-- 0039 maakte hem partieel op `where geaccepteerd_op is null`. De
-- selectie krijgt met deze migratie een tweede eindtoestand, en zonder
-- aanpassing blijven opgegeven rijen voorgoed in de index staan. Zelfde
-- naam, nieuw predicaat: drop en create in één migratie, zodat er geen
-- tweede index met bijna hetzelfde doel ontstaat.

drop index if exists intel.meldberichten_te_verzenden_idx;

create index if not exists meldberichten_te_verzenden_idx
  on intel.meld_berichten (organisatie_id, volgende_poging_op)
  where geaccepteerd_op is null and opgegeven_op is null;

-- ---------------------------------------------------------------- 4
-- GEEN BACKFILL, en dat is een meting en geen gok.
--
-- Een backfill zou alleen iets doen voor rijen die onverzonden zijn
-- blijven staan. Gemeten op productie, 19 oktober 2026, read-only:
-- `select count(*) from intel.meld_berichten where geaccepteerd_op is
-- null` = 0. Alle 11 rijen zijn geaccepteerd. Er is dus niets om te
-- markeren, en een `update` die nul rijen raakt hoort niet in een
-- migratie te staan alsof hij iets betekent.
--
-- Mocht er in een andere omgeving wél een vastgelopen rij staan: die
-- wordt NIET automatisch opgegeven. Hij is onder de pogingengrens nog
-- gewoon verzendbaar en wordt bij de volgende echte uitkomst volgens de
-- nieuwe regel afgehandeld; staat hij op of boven de grens, dan sloot
-- de selectie hem al uit en blijft dat zo.

-- ---------------------------------------------------------------- 5
-- Rechten: niets te doen. 0039 geeft `select, insert, update` op
-- TABELniveau aan vibe_intel_app, en een nieuwe kolom erft die grant.
-- Er zijn geen kolomgrants op deze tabel.
--
-- De append-only triggers blijven ongemoeid. meldbericht_identiteit_vast
-- somt de onveranderlijke velden OP (soort, bundel, vingerafdruk,
-- onderwerp, melding_ids, html, tekst, organisatie_id, aangemaakt_op);
-- opgegeven_op staat daar bewust niet bij, want het is een bezorgveld.
-- Zet hem daar niet alsnog bij: dan werpt de verzendlus zijn eigen
-- UPDATE met 'de identiteit van een meldbericht staat vast'.
