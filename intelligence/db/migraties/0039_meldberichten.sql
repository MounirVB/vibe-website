-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0039 het meldberichtenlogboek
-- ------------------------------------------------------------
-- WAAROM:       `intel.meldingen` houdt de STAAT van een storing bij:
--               open, hoe vaak gezien, gesloten. Dat is precies wat het
--               moet doen en het blijft ongewijzigd.
--
--               Wat er niet was, is een logboek van wat er naar BUITEN
--               is gegaan. De twee kolommen die er voor bezorging in
--               `meldingen` staan (bezorgd_op, bezorgpogingen) kunnen
--               maar EEN bezorging per storing vastleggen, en dat is te
--               weinig zodra dezelfde storing een CRITICAL-alarm, later
--               een FOUT-herhaling bij ernststijging, en uiteindelijk
--               een HERSTEL-bericht verdient. Drie berichten over een
--               storing, en een rij die er maar een kan onthouden.
--
--               Daarnaast eist de opdracht onderscheid tussen
--               AANGEBODEN, GEACCEPTEERD DOOR DE PROVIDER, AFGELEVERD en
--               GELEZEN. De oude kolom `bezorgd_op` kan dat verschil
--               niet uitdrukken: hij zegt alleen 'er is iets gelukt'.
--
-- WAT DIT DOET: een APPEND-ONLY logboek van uitgaande meldberichten,
--               met een unieke sleutel die dubbel verzenden per
--               constructie onmogelijk maakt.
--
-- WAT DIT NIET DOET: het raakt `intel.meldingen` niet aan, op twee
--               additieve kolommen na (bundel en ernst). Er wordt geen
--               kolom gedropt, geen constraint verruimd en geen
--               bestaande waarde herschreven.
--
-- TERUGDRAAIEN: drop table intel.meld_berichten; en de twee kolommen
--               van intel.meldingen droppen. Beide additief, dus
--               terugdraaien kost geen data behalve het logboek zelf.
-- ============================================================

-- ---------------------------------------------------------------- 1
-- Twee additieve kolommen op de incidenttabel.

alter table intel.meldingen
  add column if not exists bundel text;

comment on column intel.meldingen.bundel is
  'De GROEPERINGSSLEUTEL van de onderliggende oorzaak. Gemeten op productie 14 oktober 2026: '
  'drie FOUT-signalen (ingestie/bronnen met opeenvolgende fouten, ingestie/storingssoort '
  'TOEGANG_BEPERKT, ingestie/brondekking) hebben EEN oorzaak — de bron rendo-nieuws. Drie losse '
  'alarmen voor een probleem is geen monitoring maar ruis. De bundel maakt ze herkenbaar als een '
  'incident; de drie meldingen blijven apart bestaan, want ze meten elk iets anders.';

alter table intel.meldingen
  add column if not exists ernst text;

alter table intel.meldingen
  drop constraint if exists meldingen_ernst_geldig;
alter table intel.meldingen
  add constraint meldingen_ernst_geldig check (
    ernst is null or ernst in ('CRITICAL', 'FOUT', 'WARNING'));

comment on column intel.meldingen.ernst is
  'De alarmklasse, afgeleid uit niveau + groep + aanvaard. NIET hetzelfde als `niveau`: niveau is '
  'wat de meting zag (OK/LET OP/FOUT/NIET GEMETEN), ernst is wat het voor een mens betekent. Een '
  'NIET GEMETEN op een AANVAARDE grens krijgt geen ernst en dus geen alarm — het signaal blijft '
  'zichtbaar in het gezondheidsrapport, maar het belt niemand. Zie de kop van src/ops/meldernst.ts.';

-- ---------------------------------------------------------------- 2
-- Het logboek.

create table if not exists intel.meld_berichten (
  id                bigserial primary key,
  organisatie_id    integer not null references intel.organisaties(id) on delete cascade,

  -- WAT voor bericht. Vier soorten, elk met eigen verzendregels.
  soort             text    not null,

  -- De bundel waar dit bericht over gaat. Een CRITICAL of FOUT gaat over
  -- een bundel; een WARNING-overzicht en de eenmalige beginsamenvatting
  -- gaan over de hele stand en dragen een vaste sleutel.
  bundel            text    not null,

  -- DE VINGERAFDRUK IS DE DEDUPLICATIE. Hij vat samen WAT er gemeld is:
  -- de ernst, de betrokken signalen en hun metingen. Verandert de
  -- toestand wezenlijk, dan verandert de vingerafdruk en mag er opnieuw
  -- worden gemeld. Blijft hij gelijk, dan is er niets nieuws te zeggen
  -- en houdt de unieke index hieronder het tweede bericht tegen.
  vingerafdruk      text    not null,

  ernst             text,
  onderwerp         text    not null,

  -- DE INHOUD HOORT HIER, EN DAT IS EEN GEMETEN BESLUIT.
  -- De eerste versie bewaarde alleen de identiteit en bouwde de tekst bij
  -- elke poging opnieuw uit de meldingen. Toets 6 van
  -- test/integratie/meldmailketen.test.ts liet zien waar dat op stukloopt:
  -- een bericht dat MISLUKTE kon daarna nooit meer worden verstuurd, omdat
  -- het plan intussen was opgeschoven (de beginsamenvatting is er maar
  -- een keer). Een bericht dat is aangeboden en niet aankwam, en dat
  -- daarna onverstuurbaar wordt, is precies het verlies dat par. 4.8
  -- verbiedt.
  --
  -- Daarom staat de VERZONDEN TEKST hier. Dat is geen tweede waarheid
  -- naast de meldingen: het is het artefact dat we hebben belooft af te
  -- leveren, en het is onveranderlijk zodra de rij bestaat.
  html              text,
  tekst             text,

  -- De meldingen die in dit bericht zaten, voor het auditspoor.
  melding_ids       bigint[] not null default '{}',

  -- ---- de vier bezorgtoestanden, elk apart ----
  -- Par. 4.9: aangeboden, geaccepteerd door de provider, afgeleverd en
  -- gelezen zijn VIER verschillende dingen. Alleen de eerste twee kunnen
  -- wij zelf vaststellen; de laatste twee vragen een webhook van de
  -- provider die er niet is. Daarom staan ze hier als nullable kolommen
  -- die leeg BLIJVEN tot er bewijs is, in plaats van dat 'bezorgd' iets
  -- beweert wat niet gemeten is.
  aangeboden_op     timestamptz,
  geaccepteerd_op   timestamptz,
  afgeleverd_op     timestamptz,
  gelezen_op        timestamptz,

  provider          text,
  provider_id       text,

  pogingen          integer not null default 0,
  laatste_fout      text,
  -- Back-off: niet opnieuw proberen voor dit moment. Par. 4.6.
  volgende_poging_op timestamptz,

  aangemaakt_op     timestamptz not null default now(),

  constraint meldberichten_soort_geldig
    check (soort in ('CRITICAL', 'FOUT', 'WARNING', 'HERSTEL', 'BEGINSAMENVATTING', 'TEST')),
  constraint meldberichten_ernst_geldig
    check (ernst is null or ernst in ('CRITICAL', 'FOUT', 'WARNING')),
  -- Een geaccepteerd bericht is per definitie aangeboden, en afgeleverd
  -- kan niet zonder geaccepteerd. De keten mag geen gat hebben.
  constraint meldberichten_keten_klopt check (
    (geaccepteerd_op is null or aangeboden_op is not null)
    and (afgeleverd_op is null or geaccepteerd_op is not null)
    and (gelezen_op is null or afgeleverd_op is not null)),
  constraint meldberichten_onderwerp_niet_leeg check (length(onderwerp) >= 10),
  constraint meldberichten_vingerafdruk_vorm check (vingerafdruk ~ '^[0-9a-f]{16,64}$')
);

-- DE GRENDEL TEGEN DUBBEL VERZENDEN. Een unieke index, niet een
-- controle in code: de worker mag vanaf twee plekken tegelijk draaien en
-- dan is een `select ... if not exists ... insert` een race. Par. 4.5.
create unique index if not exists meldberichten_eenmalig
  on intel.meld_berichten (organisatie_id, soort, bundel, vingerafdruk);

create index if not exists meldberichten_te_verzenden_idx
  on intel.meld_berichten (organisatie_id, volgende_poging_op)
  where geaccepteerd_op is null;

create index if not exists meldberichten_tijdlijn_idx
  on intel.meld_berichten (organisatie_id, aangemaakt_op desc);

comment on table intel.meld_berichten is
  'Append-only logboek van UITGAANDE meldberichten. Elke rij is een bericht dat is of wordt '
  'aangeboden aan een e-mailprovider. De unieke index meldberichten_eenmalig is de deduplicatie: '
  'dezelfde soort + bundel + vingerafdruk kan maar EEN keer bestaan, dus dezelfde storing in '
  'dezelfde toestand wordt nooit twee keer gemeld, ook niet door twee workers tegelijk. '
  'Verandert de toestand wezenlijk, dan verandert de vingerafdruk en is het een nieuw bericht.';

comment on column intel.meld_berichten.afgeleverd_op is
  'BLIJFT LEEG zolang er geen providerwebhook is. Resend kan aflevering en opening rapporteren via '
  'een webhook; die is niet geconfigureerd, dus dit veld wordt niet gevuld. Een leeg veld is hier '
  'het eerlijke antwoord: wij weten dat de provider het bericht heeft GEACCEPTEERD en niet dat de '
  'ontvanger het heeft gekregen.';

-- ---------------------------------------------------------------- 3
-- Append-only, zoals het auditspoor en het besluitenlogboek (0001, 0036).

create or replace function intel_priv.meldbericht_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception
    'intel.meld_berichten is append-only voor wijzigingen aan de identiteit van een bericht '
    '(poging tot %). De bezorgvelden mogen wel worden bijgewerkt; zie de trigger.', tg_op;
end $$;

revoke all on function intel_priv.meldbericht_is_append_only() from public;

-- DELETE kan nooit. UPDATE mag ALLEEN de bezorgvelden raken: een bericht
-- dat is aangeboden moet zijn uitkomst kunnen vastleggen, maar de
-- identiteit (soort, bundel, vingerafdruk, onderwerp, melding_ids) staat
-- vast zodra de rij bestaat.
create or replace function intel_priv.meldbericht_identiteit_vast()
returns trigger language plpgsql as $$
begin
  if new.soort <> old.soort
     or new.bundel <> old.bundel
     or new.vingerafdruk <> old.vingerafdruk
     or new.onderwerp <> old.onderwerp
     or new.melding_ids <> old.melding_ids
     or new.html is distinct from old.html
     or new.tekst is distinct from old.tekst
     or new.organisatie_id <> old.organisatie_id
     or new.aangemaakt_op <> old.aangemaakt_op then
    raise exception
      'de identiteit van een meldbericht staat vast; alleen de bezorgvelden mogen bijgewerkt '
      'worden. Een ander bericht is een nieuwe rij.';
  end if;
  return new;
end $$;

revoke all on function intel_priv.meldbericht_identiteit_vast() from public;

drop trigger if exists meldberichten_geen_verwijdering on intel.meld_berichten;
create trigger meldberichten_geen_verwijdering
  before delete on intel.meld_berichten
  for each statement execute function intel_priv.meldbericht_is_append_only();

drop trigger if exists meldberichten_identiteit_vast on intel.meld_berichten;
create trigger meldberichten_identiteit_vast
  before update on intel.meld_berichten
  for each row execute function intel_priv.meldbericht_identiteit_vast();

-- ---------------------------------------------------------------- 4
-- Rechten, in de stijl van 0024: de applicatierol mag schrijven en
-- lezen, maar niet verwijderen.

grant select, insert, update on intel.meld_berichten to vibe_intel_app;
grant select on intel.meld_berichten to vibe_intel_lezer;
grant usage, select on sequence intel.meld_berichten_id_seq to vibe_intel_app;

alter table intel.meld_berichten enable row level security;

drop policy if exists meldberichten_eigen_organisatie on intel.meld_berichten;
create policy meldberichten_eigen_organisatie on intel.meld_berichten
  using (organisatie_id = current_setting('app.organisatie_id', true)::integer)
  with check (organisatie_id = current_setting('app.organisatie_id', true)::integer);
