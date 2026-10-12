-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0016 meldingen
-- ------------------------------------------------------------
-- WAAROM:       `npm run gezondheid` was een COMMANDO, geen alarm. Het
--               meet twintig signalen en geeft een exitcode, maar als
--               niemand het draait gebeurt er niets, en als iemand het
--               elk kwartier draait zou elke keer dezelfde storing
--               opnieuw worden gemeld.
--
--               Een alerteerlaag die alleen "stuur bij FOUT" doet, is
--               daarom onbruikbaar: je krijgt 96 meldingen per dag over
--               één kapotte bron en geen enkele melding dat hij weer
--               werkt. Wat er mist is STAAT: welke storing loopt nog, en
--               welke is voorbij.
--
-- WAT DIT DOET: één tabel met open en gesloten meldingen. De sleutel is
--               groep+naam van het signaal, en er mag per organisatie
--               maar ÉÉN open melding met dezelfde sleutel bestaan. Dat
--               is de deduplicatie, en hij zit in een unieke index en
--               niet in applicatiecode — want de monitor kan vanaf
--               meerdere plekken tegelijk draaien.
--
-- BEZORGING IS APART VAN DETECTIE:
--               `bezorgd_op` en `bezorgpogingen` staan los van de
--               melding zelf. Een melding die niet bezorgd kon worden is
--               nog steeds een melding, en dat hoort zichtbaar te zijn
--               in plaats van verloren te gaan. Zolang er geen
--               geautoriseerde bestemming is, blijft `bezorgd_op` leeg
--               en meldt de monitor dat eerlijk.
--
-- TERUGDRAAIEN: drop table intel.meldingen;
-- ============================================================

begin;

create table if not exists intel.meldingen (
  id                bigserial primary key,
  organisatie_id    integer not null references intel.organisaties(id) on delete cascade,

  -- De identiteit van de storing: groep en naam uit het signaal.
  sleutel           text    not null,
  groep             text    not null,
  niveau            text    not null,

  -- De eerste en de laatste keer dat we hem zagen, plus hoe vaak.
  geopend_op        timestamptz not null default now(),
  laatst_gezien_op  timestamptz not null default now(),
  keren_gezien      integer not null default 1,
  gesloten_op       timestamptz,

  laatste_meting    text    not null,
  laatste_advies    text,

  -- Bezorging, los van detectie.
  bezorgd_op        timestamptz,
  bezorgpogingen    integer not null default 0,
  laatste_bezorgfout text,
  bestemming        text,

  constraint meldingen_niveau_geldig
    check (niveau in ('FOUT', 'NIET GEMETEN', 'LET OP')),
  -- Een gesloten melding kan niet in de toekomst gesloten zijn, en een
  -- open melding heeft geen sluitingstijd.
  constraint meldingen_sluiting_na_opening
    check (gesloten_op is null or gesloten_op >= geopend_op)
);

-- DE DEDUPLICATIE. Precies één OPEN melding per sleutel per organisatie.
-- Een partiële unieke index en geen applicatiecontrole: de monitor mag
-- vanaf twee plekken tegelijk draaien zonder dubbele meldingen te maken.
create unique index if not exists meldingen_een_open_per_sleutel
  on intel.meldingen (organisatie_id, sleutel)
  where gesloten_op is null;

create index if not exists meldingen_open_op_niveau
  on intel.meldingen (organisatie_id, niveau, geopend_op desc)
  where gesloten_op is null;

create index if not exists meldingen_onbezorgd
  on intel.meldingen (organisatie_id, bezorgpogingen)
  where gesloten_op is null and bezorgd_op is null;

alter table intel.meldingen enable row level security;

drop policy if exists meldingen_eigen_organisatie on intel.meldingen;
create policy meldingen_eigen_organisatie on intel.meldingen
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);

grant select, insert, update on intel.meldingen to vibe_intel_app;
grant usage on sequence intel.meldingen_id_seq to vibe_intel_app;
grant select on intel.meldingen to vibe_intel_lezer;

comment on table intel.meldingen is
  'Open en gesloten operationele meldingen, afgeleid van de signalen uit '
  'src/ops/gezondheid.ts. De unieke index meldingen_een_open_per_sleutel is '
  'de deduplicatie. Bezorging staat los van detectie: een melding die niet '
  'verzonden kon worden blijft bestaan.';

commit;
