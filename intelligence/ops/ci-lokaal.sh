#!/usr/bin/env bash
# ============================================================
#  OPS — de CI-poort lokaal nabootsen
#  ------------------------------------------------------------
#    bash intelligence/ops/ci-lokaal.sh
#
#  Draait precies de stappen uit .github/workflows/poort.yml, in
#  dezelfde volgorde, tegen een VERSE wegwerpdatabase.
#
#  WAAROM DIT BESTAAT
#  Een werkstroom die nooit gedraaid heeft is een bewering, geen
#  poort. GitHub Actions kan hier niet draaien zonder te pushen, en
#  pushen naar deze repository is een productiedeploy. Dit script is
#  daarom het bewijs dat de stappen werken: dezelfde commando's,
#  dezelfde omgevingsvariabelen, een database die vanaf nul wordt
#  gemigreerd.
#
#  Het verschil met CI dat blijft: CI draait op ubuntu-latest met een
#  postgres:17-alpine servicecontainer, hier is het macOS met de
#  lokale Postgres 17. De pg-major is gelijk; het besturingssysteem
#  niet. Dat is de enige onbewezen variabele.
# ============================================================
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$HIER/.." && pwd)"
WORTEL="$(cd "$APP/.." && pwd)"

CIDB="vibe_intel_cilokaal_$$"
BRON_URL="$(grep '^INTEL_DB_URL=' "$APP/.env" | cut -d= -f2-)"
BEHEER_URL="${BRON_URL%/*}/postgres"
CI_URL="${BRON_URL%/*}/$CIDB"

GESLAAGD=0
GEFAALD=0
declare -a MISLUKT=()

stap() {
  local naam="$1"; shift
  printf '\n\033[1m>>> %s\033[0m\n' "$naam"
  if "$@"; then
    GESLAAGD=$((GESLAAGD + 1))
    printf '    PASS  %s\n' "$naam"
  else
    GEFAALD=$((GEFAALD + 1))
    MISLUKT+=("$naam")
    printf '    FAIL  %s\n' "$naam"
  fi
}

opruimen() {
  psql "$BEHEER_URL" -q -c \
    "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$CIDB'" >/dev/null 2>&1 || true
  psql "$BEHEER_URL" -q -c "drop database if exists $CIDB" >/dev/null 2>&1 || true
}
trap opruimen EXIT

echo ""
echo "CI-POORT LOKAAL"
echo "==============================================================="
echo "  wegwerpdatabase  $CIDB"
echo "  app              $APP"
echo "  site             $WORTEL"

psql "$BEHEER_URL" -q -c "create database $CIDB"

export INTEL_DB_URL="$CI_URL"
export INTEL_OMGEVING=test
export INTEL_ORGANISATIE=vibe-energy
export INTEL_DB_APP_ROL=vibe_intel_app
export INTEL_DB_ONDERHOUD_ROL=vibe_intel_onderhoud
export INTEL_SITE_BASIS_URL=https://www.vibeenergy.nl
export INTEL_SITE_WORTEL="$WORTEL"
export INTEL_NETWERK_TOEGESTAAN=0
export INTEL_SESSIE_GEHEIM=ci-geheim-dat-nergens-toegang-geeft-32+
export INTEL_LOG_NIVEAU=waarschuwing

# ---------------- job: release1 ----------------
cd "$WORTEL"
STATUS_VOOR="$(git status --porcelain -- . ':(exclude)intelligence')"
stap "release1: generatorketen (offline)" node scripts/seo/bouw.mjs --offline

# CI vergelijkt met een lege git status, want daar is de checkout
# schoon. Lokaal staat er bijna altijd werk open, dus hier wordt de
# status VOOR de ketenrun vastgelegd en daarna vergeleken. Zo meet het
# script de generator en niet de werkboom.
generator_reproduceerbaar() {
  local na
  na="$(git status --porcelain -- . ':(exclude)intelligence')"
  if [ "$na" != "$STATUS_VOOR" ]; then
    echo "    De keten wijzigde bestanden:"
    diff <(echo "$STATUS_VOOR") <(echo "$na") | sed 's/^/      /' || true
    return 1
  fi
  echo "    de werkboom is na de keten gelijk aan ervoor"
  return 0
}
stap "release1: generator is reproduceerbaar" generator_reproduceerbaar
stap "release1: QA nieuwskanaal" node scripts/seo/qa-nieuws.mjs
stap "release1: assetpoort (basislijn)" node intelligence/ops/assetpoort.mjs

# ---------------- job: release2 ----------------
cd "$APP"
stap "release2: npm ci" npm ci

lockfile_onveranderd() {
  git -C "$WORTEL" diff --quiet -- intelligence/package-lock.json
}
stap "release2: lockfile onveranderd na npm ci" lockfile_onveranderd

stap "release2: typecheck" npm run typecheck
stap "release2: migreren vanaf nul" npm run migreer
stap "release2: driftcontrole" npm run migreer -- --droog
stap "release2: eenheidstoetsen" npm run test:eenheid
stap "release2: integratietoetsen" npm run test:integratie
stap "release2: adversariele toetsen" npm run test:adversarieel

# ---------------- job: beveiliging ----------------
cd "$WORTEL"
stap "beveiliging: geheimenscan" node intelligence/ops/geheimenscan.mjs
stap "beveiliging: publicatiecontract" node intelligence/ops/publicatiecontract.mjs
cd "$APP"
stap "beveiliging: npm audit (hoog blokkeert)" npm audit --audit-level=high

# ---------------- rapport ----------------
echo ""
echo "==============================================================="
printf 'STAPPEN  %s   PASS %s   FAIL %s\n' "$((GESLAAGD + GEFAALD))" "$GESLAAGD" "$GEFAALD"
if [ "$GEFAALD" -gt 0 ]; then
  echo ""
  for m in "${MISLUKT[@]}"; do echo "  FAIL $m"; done
  echo ""
  echo "EINDOORDEEL CI-POORT LOKAAL = FAIL"
  exit 1
fi
echo ""
echo "EINDOORDEEL CI-POORT LOKAAL = PASS"
echo "Let op: dit bewijst de STAPPEN, niet de runner. CI draait op"
echo "ubuntu-latest met een postgres:17-alpine servicecontainer."
