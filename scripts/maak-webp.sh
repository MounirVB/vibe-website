#!/bin/sh
# ============================================================================
# Genereert responsive WebP-varianten voor de projectfoto's en paginaheroes.
# Volgt de bestaande naamgeving van assets/home en assets/systeem:
#   <basis>-<breedte>.webp
#
# Idempotent: een variant die al bestaat en nieuwer is dan de bron wordt
# overgeslagen. Draai opnieuw na het toevoegen van een foto.
#
#   sh scripts/maak-webp.sh
# ============================================================================
set -e
cd "$(dirname "$0")/.."

maak() {
  bron="$1"; breedte="$2"; kwaliteit="$3"
  map=$(dirname "$bron")
  basis=$(basename "$bron"); basis="${basis%.*}"
  doel="$map/$basis-$breedte.webp"
  if [ -f "$doel" ] && [ "$doel" -nt "$bron" ]; then return; fi
  # Nooit opschalen. Een afgeleide breder dan de bron voegt geen detail toe,
  # alleen bytes, en liegt bovendien tegen de srcset-keuze van de browser.
  bronbreedte=$(sips -g pixelWidth "$bron" 2>/dev/null | awk '/pixelWidth/{print $2}')
  if [ -n "$bronbreedte" ] && [ "$breedte" -gt "$bronbreedte" ]; then
    printf '  %-52s overgeslagen, bron is %s px\n' "$doel" "$bronbreedte"
    return
  fi
  cwebp -quiet -q "$kwaliteit" -resize "$breedte" 0 -m 6 -sharp_yuv "$bron" -o "$doel"
  printf '  %-52s %6s KB\n' "$doel" "$(( $(wc -c < "$doel") / 1024 ))"
}

# 800 is de sport voor de kaarten in "Andere projecten": die renderen 650 px op
# 1440 en maximaal 732 px vanaf 1600. Zonder die sport springt de browser van
# 640 (te klein) naar 1200 (bijna twee keer te groot).
echo "Projectfoto's -> 640 / 800 / 1200 / 1800"
for f in assets/projects/*.jpg; do
  [ -e "$f" ] || continue
  for w in 640 800 1200 1800; do maak "$f" "$w" 80; done
done

echo "Paginaheroes -> 960 / 1600 / 2400"
for f in assets/*-hero.jpg; do
  [ -e "$f" ] || continue
  for w in 960 1600 2400; do maak "$f" "$w" 78; done
done

# Losse illustratieve opname buiten assets/projects/: dit is GEEN projectfoto —
# het is een loodrechte luchtopname van een stedelijk bouwblok met zonnedaken,
# waarvan het project niet is vastgesteld. Daarom staat hij niet onder
# assets/projects/ en valt hij buiten beide globs hierboven.
echo "Losse illustratie -> 640 / 800 / 1200 / 1800"
for w in 640 800 1200 1800; do maak assets/bouwblok-zonnedaken.jpg "$w" 80; done

echo "Losse beelden uit img/ -> 640 / 1200"
for f in img/ems-tech.jpg img/monteurs-werktekening.jpg img/office-solar.jpg; do
  [ -e "$f" ] || continue
  for w in 640 1200; do maak "$f" "$w" 80; done
done

# Eigen Vibe-fotografie op VIBE.CONTROL. De breedtes volgen de gerenderde maat
# in de layout, niet een vaste reeks:
#   control-meting      ve-media--4x3, sizes "(min-width:1024px) 560px, 100vw"
#   batterij-binnenwerk ve-media--21x9 volbreed, sizes "100vw"
echo "VIBE.CONTROL-fotografie -> maten uit de layout"
for w in 640 900 1200; do maak img/control-meting.jpg "$w" 86; done
for w in 880 1400 1800; do maak img/batterij-binnenwerk.jpg "$w" 86; done

echo "Klaar."
