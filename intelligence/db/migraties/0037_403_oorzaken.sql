-- ============================================================
-- VIBE ENERGY INTELLIGENCE — 0037 een 403 is drie dingen, niet één
-- ------------------------------------------------------------
-- WAAROM:       `classificeerStoring()` beeldde elke HTTP 403 af op
--               TOEGANG_BEPERKT, en die soort betekent volgens zijn
--               eigen handelingstekst "officiele toegang vragen bij de
--               uitgever". Daarmee beweerde het platform bij elke 403
--               dat de UITGEVER ons weigert.
--
--               Gemeten tegenvoorbeeld op 13-14 oktober 2026,
--               bron `rendo-nieuws`:
--
--                 vanaf Railway   HTTP 403 op /robots.txt EN /feed/,
--                                 server: cloudflare, cf-ray ...-PDX,
--                                 titel "Attention Required! | Cloudflare"
--                 vanaf een NL-   HTTP 200 op beide, met DEZELFDE
--                 egress          user-agent, feed met 10 <item>
--                 robots.txt      "User-agent: *" met een LEGE
--                                 "Disallow:" — expliciete toestemming
--                                 voor alles, geen TDM-voorbehoud
--
--               De uitgever verbiedt dus niets. Cloudflare weigert een
--               hostingnetwerk. Dat vraagt een uitzondering op een
--               firewallregel, niet een toestemmingsverzoek — een ander
--               gesprek met een andere partij.
--
-- WAT DIT DOET: verbreedt de check constraint op
--               intel.bronnen.storingssoort met twee waarden:
--
--                 CDN_BLOKKADE      een CDN of WAF weigert ons netwerk,
--                                   aantoonbaar aan CDN-bewijs in het
--                                   antwoord (eigen header, of de
--                                   server-header plus een bekende
--                                   blokkadetitel)
--                 TOEGANG_ONBEKEND  een 403 zonder bewijs van beleid,
--                                   CDN of authenticatie. Bewust een
--                                   eigen soort: twijfel mag geen
--                                   conclusie worden
--
--               ACHTERWAARTS COMPATIBEL EN NIET-DESTRUCTIEF. De
--               constraint wordt VERBREED, niet versmald: elke
--               bestaande rij blijft geldig. Er wordt geen kolom
--               gedropt, geen rij aangeraakt en geen waarde herschreven.
--               Bestaande TOEGANG_BEPERKT-rijen houden hun waarde tot de
--               volgende ophaalpoging ze opnieuw classificeert.
--
-- WAT DIT NIET DOET
--               Het verlaagt geen enkele ernst. CDN_BLOKKADE en
--               TOEGANG_ONBEKEND tellen in ops/gezondheid.ts even zwaar
--               als TOEGANG_BEPERKT, en in ops/brondekking.ts vallen ze
--               in dezelfde klasse. Een bron die geblokkeerd is, blijft
--               geblokkeerd; alleen de REDEN wordt waar. Een FAILED-bron
--               gaat nooit naar OK zonder een geslaagde ophaling.
--
-- TERUGDRAAIEN: de constraint terugzetten op de negen waarden van 0028.
--               Dat kan alleen als geen rij een van de twee nieuwe
--               waarden draagt:
--                 update intel.bronnen set storingssoort = 'TOEGANG_BEPERKT'
--                   where storingssoort in ('CDN_BLOKKADE','TOEGANG_ONBEKEND');
--               en daarna de oude constraint uit 0028 opnieuw aanmaken.
-- ============================================================

alter table intel.bronnen drop constraint if exists bronnen_storingssoort_geldig;
alter table intel.bronnen add constraint bronnen_storingssoort_geldig check (
  storingssoort is null or storingssoort in (
    'TIJDELIJKE_STORING',
    'TOEGANG_BEPERKT',
    'SNELHEIDSBEGRENSD',
    'ONGELDIG_ENDPOINT',
    'ONTLEDING_MISLUKT',
    'LEEG_MAAR_GEZOND',
    'AFGESCHAFT',
    'NIET_GEAUTORISEERD',
    'NETWERKFOUT',
    'CDN_BLOKKADE',
    'TOEGANG_ONBEKEND'
  )
);

comment on column intel.bronnen.storingssoort is
  'Waarom een bron niet levert, in elf soorten (bronnen/storingssoort.ts). Elke soort vraagt een '
  'andere handeling; zie STORINGSSOORT_HANDELING. CDN_BLOKKADE en TOEGANG_ONBEKEND zijn in 0037 '
  'toegevoegd omdat een 403 niet per definitie betekent dat de uitgever ons weigert: een CDN kan '
  'ons netwerk weigeren terwijl de robots.txt van die uitgever crawlen expliciet toestaat.';
