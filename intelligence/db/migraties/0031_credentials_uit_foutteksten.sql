-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0031 credentials uit bewaarde foutteksten
-- ------------------------------------------------------------
-- WAAROM:       Een gemeten lek, niet een voorzorg.
--
--               `ops/backup.ts` gaf de verbindings-URL als laatste
--               argv-element aan pg_dump. Node zet bij een mislukte
--               execFile de HELE commandoregel in `Error.message`, en
--               `kern/wachtrij.ts` schreef die message ruw in
--               intel.taken.laatste_fout. Een falende dagelijkse
--               back-up zette daarmee het databasewachtwoord in de
--               database. Dezelfde vorm kon via ops/melden.ts in
--               intel.meldingen.laatste_bezorgfout belanden.
--
--               Release 3.0.4 dicht de BRON (de credential staat niet
--               meer in argv) en zet een REDACTIE op elke log- en
--               persisteerroute. Deze migratie ruimt op wat er
--               eventueel al staat: een rij blijft staan, maar zonder
--               het geheim.
--
--               Dat opruimen kan niet door de applicatie zelf: de
--               applicatierol mag niet uit intel.taken verwijderen of
--               wijzigen (bewust; getoetst in wachtrij.test.ts). De
--               migratieloper draait als eigenaar en kan het wel.
--
-- WAT DIT DOET: vervangt ALLEEN het wachtwoorddeel van een
--               credential-URL door [verborgen] en laat de rest van de
--               diagnostische tekst staan. Geen rij wordt verwijderd en
--               geen andere kolom wordt aangeraakt, zodat het
--               operationele spoor navolgbaar blijft.
--
--               Het patroon dekt elk schema met een wachtwoord
--               (postgres, postgresql, en de vorm die een proxy-URL
--               aanneemt), en is idempotent: een tweede run vindt niets
--               meer omdat [verborgen] geen `@` meer voorafgaat.
--
-- LET OP:       Dit is GEEN vervanging voor rotatie. Levert de meting
--               (`npm run meting`) een telling boven nul op, dan is het
--               wachtwoord gelekt geweest en hoort het geroteerd te
--               worden. Deze migratie maakt de database schoon, niet de
--               geschiedenis van Railway-logs.
--
-- TERUGDRAAIEN: niet mogelijk en niet wenselijk. De weggehaalde tekst
--               was een geheim; terugzetten zou het lek herstellen.
-- ============================================================

-- De sanering. `regexp_replace` met de capture group houdt schema,
-- gebruiker en host leesbaar — die zijn geen geheim en helpen bij
-- diagnose — en vervangt uitsluitend wat tussen de dubbele punt en de
-- apenstaart staat.
update intel.taken
   set laatste_fout = regexp_replace(
         laatste_fout,
         '([a-zA-Z+]+://[^:/@[:space:]]+:)[^@[:space:]]+@',
         '\1[verborgen]@',
         'g')
 where laatste_fout is not null
   and laatste_fout ~ '[a-zA-Z+]+://[^:/@[:space:]]+:[^@[:space:]]+@';

update intel.meldingen
   set laatste_bezorgfout = regexp_replace(
         laatste_bezorgfout,
         '([a-zA-Z+]+://[^:/@[:space:]]+:)[^@[:space:]]+@',
         '\1[verborgen]@',
         'g')
 where laatste_bezorgfout is not null
   and laatste_bezorgfout ~ '[a-zA-Z+]+://[^:/@[:space:]]+:[^@[:space:]]+@';

-- Het aantal dat is opgeruimd hoort meetbaar te zijn, en een NOTICE
-- haalt het deploylog niet (node-postgres slikt notices zonder
-- listener). Daarom legt de migratie de uitkomst vast in de tabel die
-- daar al voor bestaat, zodat `npm run meting` en het dashboard hem
-- kunnen laten zien.
insert into intel.systeem_meldingen (soort, ernst, bericht)
select
  'credential_sanering',
  case when count(*) > 0 then 'waarschuwing' else 'info' end,
  case
    when count(*) > 0 then
      'migratie 0031 vond nog ' || count(*) ||
      ' fouttekst(en) met een credential en heeft die geredigeerd. ' ||
      'Roteer INTEL_DB_URL: het wachtwoord is gelekt geweest.'
    else
      'migratie 0031 vond geen fouttekst met een credential; geen rotatie nodig op grond van deze meting.'
  end
from intel.taken
where laatste_fout is not null
  and laatste_fout ~ '\[verborgen\]@';
