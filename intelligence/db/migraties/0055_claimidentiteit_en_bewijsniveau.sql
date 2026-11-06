-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0055 claimidentiteit, bewijsniveau en
--                            de originele brontekst
-- ------------------------------------------------------------
-- DRIE KOLOMMEN VOOR DRIE GEMETEN GEVALLEN, en alle drie additief.
--
-- ------------------------------------------------------------
-- 1 · uitspraken.claim_afdruk — DE CANONIEKE IDENTITEIT (§4)
--
-- De dedupsleutel in schrijfUitspraken() bevat `versie_id`. Dat is
-- juist voor wat die query doet, en het is precies het gat dat §4
-- aanwijst. Gemeten in productie op 6 november 2026:
--
--   brondocument 73052 (rijksoverheid.nl, subsidieregeling
--   groepshulpen in de kinderopvang), 2 versies:
--     versie 3925  "Het beschikbare subsidiebudget voor de
--                   aanvraagperiode 2026 is EUR 1.775.000."
--     versie 4120  dezelfde zin, hetzelfde bedrag
--
-- Twee claimrijen, één feit. In §3 is dat erger dan cosmetisch: wie
-- onafhankelijke bevestigingen telt zonder identiteit, telt twee
-- versies van één document als twee bronnen.
--
-- DE AFDRUK VOEGT NIETS SAMEN. Hij is een label; beide rijen blijven
-- staan, met hun eigen bronversie en hun eigen auditspoor. "Geen
-- destructieve deduplicatie" is daarmee een eigenschap van het ontwerp
-- en geen regel die iemand moet naleven.
--
-- WAT ER IN DE AFDRUK ZIT staat in claimidentiteit.ts, en de vier die
-- de opdracht met naam noemt zitten er alle vier afzonderlijk in: een
-- gewijzigd bedrag, een gewijzigde datum, een gewijzigde modaliteit en
-- een gewijzigde status geven elk een ANDERE afdruk.
--
-- ------------------------------------------------------------
-- 2 · uitspraken.bewijsniveau — DE VIJF NIVEAUS (§3)
--
-- Gemeten op vijf echte gebeurtenissen: 15 ruwe claims, nul
-- bevestigd, alle vijftien op VERIFICATIE_NODIG. Niet omdat de
-- extractie faalt maar omdat geen van die bronnen zichzelf mag
-- bevestigen: energie-nederland en netbeheer-nederland komen uit op
-- SECUNDAIRE_BERICHTGEVING / BELANGENBEHARTIGER met plafond 2,
-- nkl-laadinfra op FEITELIJKE_MEDEDELING / BELANGENBEHARTIGER met
-- plafond 3. Van de 4.352 bronversies is er 111 (2,6%) van een soort
-- die zichzelf kan bevestigen.
--
-- `bewijsniveau` zegt WAAROM een claim niet bevestigd is, in vijf
-- woorden in plaats van één. Het is een LABEL NAAST
-- `verificatie_status` en vervangt hem niet: alleen DIRECT_BEVESTIGD
-- rechtvaardigt 'bevestigd', en dat besluit blijft in uitspraken.ts en
-- bronverificatie.ts staan onder dezelfde voorwaarden als gisteren.
--
-- MEERVOUDIG_BEVESTIGD IS MET OPZET GEEN GROND VOOR 'bevestigd'. Drie
-- branchepartijen die elkaar naschrijven zijn drie waarnemingen van
-- één persbericht. De CHECK hieronder dwingt dat af: een claim mag
-- alleen 'bevestigd' staan als het niveau DIRECT_BEVESTIGD is of nog
-- niet is bepaald.
--
-- ------------------------------------------------------------
-- 3 · brondocument_versies.ruwe_tekst_origineel — HET ORIGINEEL (§5)
--
-- Gemeten in productie: 32 bronversies over drie bronnen met
-- HTML-entiteiten in `ruwe_tekst`, en twee claims met een dubbel
-- geëscapeerde entiteit in hun tekst:
--
--   uitspraak 1: 'De Autoriteit Consument &amp;amp; Markt (ACM) ...'
--   uitspraak 6: '... zijn ge&amp;iuml;nstalleerd ...'
--
-- De oorzaak is één ontbrekende aanroep: verzamelen.ts normaliseerde
-- alleen witruimte en riep decodeerEntiteiten() nooit aan — die
-- functie bestond, met de volledige tabel, en werd nergens gebruikt.
--
-- "Behoud de originele brontekst voor auditdoeleinden" uit §5 woont
-- hier. De kolom is NULL-baar en wordt ALLEEN gevuld wanneer de
-- normalisatie werkelijk iets heeft veranderd; een kopie van elke
-- onveranderde tekst zou de tabel verdubbelen zonder iets vast te
-- leggen.
--
-- ------------------------------------------------------------
-- WAT DEZE MIGRATIE NIET DOET
--
-- Geen kolom verwijderd, geen type gewijzigd, geen bestaande CHECK
-- verruimd of verwijderd, geen rij aangeraakt. Geen UPDATE op
-- bestaande teksten: `ruwe_tekst` van een bestaande versie wordt NIET
-- herschreven, want dat zou de inhoudshash en daarmee het auditspoor
-- ongeldig maken. De reparatie werkt vooruit; een document dat
-- opnieuw wordt opgehaald krijgt een nieuwe versie met schone tekst,
-- en de oude versie blijft staan zoals hij was.
--
-- IDEMPOTENT:  add column if not exists + genoemde constraints die
--              eerst worden gedropt.
-- TERUGDRAAIEN: drop de drie kolommen; de CHECKs verdwijnen mee.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1 · DE CANONIEKE CLAIMIDENTITEIT
-- ------------------------------------------------------------
alter table intel.uitspraken
  add column if not exists claim_afdruk text,
  add column if not exists claim_afdruk_versie text;

comment on column intel.uitspraken.claim_afdruk is
  'De canonieke afdruk van deze feitelijke bewering, uit claimAfdruk() in '
  'claimidentiteit.ts. Twee claims met dezelfde afdruk zijn dezelfde bewering, '
  'ook als ze uit verschillende bronversies komen. VOEGT NIETS SAMEN: beide '
  'rijen blijven bestaan met hun eigen bronversie en auditspoor. Een gewijzigd '
  'bedrag, datum, modaliteit of status geeft een ANDERE afdruk.';

comment on column intel.uitspraken.claim_afdruk_versie is
  'De motorversie waaronder de afdruk is berekend. Nodig omdat een wijziging in '
  'de afdrukregel alle bestaande afdrukken ongeldig maakt; zonder dit veld is '
  'niet te zien welke rijen nog onder de oude regel staan.';

alter table intel.uitspraken drop constraint if exists uitspraken_afdruk_heeft_versie;
alter table intel.uitspraken add constraint uitspraken_afdruk_heeft_versie check (
  claim_afdruk is null or (claim_afdruk_versie is not null and length(claim_afdruk) >= 16)
);

create index if not exists uitspraken_claim_afdruk_idx
  on intel.uitspraken (organisatie_id, claim_afdruk)
  where claim_afdruk is not null;

-- ------------------------------------------------------------
-- 2 · HET BEWIJSNIVEAU
-- ------------------------------------------------------------
alter table intel.uitspraken
  add column if not exists bewijsniveau text,
  add column if not exists bewijsniveau_reden text,
  add column if not exists bewijsniveau_op timestamptz;

comment on column intel.uitspraken.bewijsniveau is
  'Hoe deze bewering wordt gedragen: DIRECT_BEVESTIGD, MEERVOUDIG_BEVESTIGD, '
  'ALLEEN_BELANGENBEHARTIGING, NIET_BEVESTIGD of TEGENSTRIJDIG. Een LABEL naast '
  'verificatie_status, niet in plaats daarvan. Alleen DIRECT_BEVESTIGD '
  'rechtvaardigt de status bevestigd; zie uitspraken_bevestigd_vraagt_direct.';

alter table intel.uitspraken drop constraint if exists uitspraken_bewijsniveau;
alter table intel.uitspraken add constraint uitspraken_bewijsniveau check (
  bewijsniveau is null or bewijsniveau in (
    'DIRECT_BEVESTIGD',
    'MEERVOUDIG_BEVESTIGD',
    'ALLEEN_BELANGENBEHARTIGING',
    'NIET_BEVESTIGD',
    'TEGENSTRIJDIG'
  )
);

alter table intel.uitspraken drop constraint if exists uitspraken_bewijsniveau_heeft_reden;
alter table intel.uitspraken add constraint uitspraken_bewijsniveau_heeft_reden check (
  bewijsniveau is null or (bewijsniveau_reden is not null and length(bewijsniveau_reden) >= 20)
);

-- ------------------------------------------------------------
-- DE GRENDEL DIE §3 AFDWINGT: MEERVOUDIG IS GEEN BEVESTIGING
--
-- "Verlaag de bewijsdrempels niet kunstmatig." Zonder deze CHECK zou
-- een latere laag MEERVOUDIG_BEVESTIGD als grond voor 'bevestigd'
-- kunnen gebruiken — drie branchepartijen die elkaar naschrijven als
-- bewijs. De database laat dat niet toe.
--
-- NOT VALID: bestaande rijen hebben bewijsniveau NULL en vallen onder
-- de eerste tak, maar de 25 reeds bevestigde claims hebben nog geen
-- niveau en zouden bij een volledige validatie onnodig worden
-- doorgerekend. De CHECK geldt onverkort voor elke nieuwe en elke
-- gewijzigde rij.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_bevestigd_vraagt_direct;
alter table intel.uitspraken add constraint uitspraken_bevestigd_vraagt_direct check (
  verificatie_status <> 'bevestigd'
  or bewijsniveau is null
  or bewijsniveau = 'DIRECT_BEVESTIGD'
) not valid;

-- ------------------------------------------------------------
-- EN EEN TEGENSPRAAK IS NOOIT VERWOORDBAAR
--
-- verwoordbaarheidspoort() geeft bij een tegengesproken claim al
-- TEGENSTRIJDIG terug, maar dat is een poort en geen grendel. Hier kan
-- de database hem niet vergeten.
-- ------------------------------------------------------------
alter table intel.uitspraken drop constraint if exists uitspraken_tegenstrijdig_niet_verwoordbaar;
alter table intel.uitspraken add constraint uitspraken_tegenstrijdig_niet_verwoordbaar check (
  bewijsniveau is distinct from 'TEGENSTRIJDIG'
  or verwoordbaar is distinct from 'VERWOORDBAAR'
);

create index if not exists uitspraken_bewijsniveau_idx
  on intel.uitspraken (organisatie_id, bewijsniveau)
  where bewijsniveau is not null;

-- ------------------------------------------------------------
-- 3 · DE ORIGINELE BRONTEKST
-- ------------------------------------------------------------
alter table intel.brondocument_versies
  add column if not exists ruwe_tekst_origineel text;

comment on column intel.brondocument_versies.ruwe_tekst_origineel is
  'De brontekst van VOOR de entiteitdecodering, en alleen gevuld wanneer de '
  'decodering werkelijk iets heeft veranderd. Bestaat voor de audit: zonder dit '
  'veld is niet meer na te gaan wat de bron werkelijk stuurde, en dan is een '
  'normalisatiewijziging onomkeerbaar. NULL betekent: de tekst was al schoon.';

commit;
