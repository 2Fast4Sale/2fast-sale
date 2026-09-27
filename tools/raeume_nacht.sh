#!/usr/bin/env bash
# Rechnet die neuen Raeume in voller Aufloesung und legt die
# Kameraeffekte darueber. Gedacht fuer die Nacht: ein Durchgang braucht
# auf zwei Kernen rund eine Dreiviertelstunde.
set -u
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
AUS="tools/proben/raeume_neu"
PROBEN=${PROBEN:-128}
mkdir -p "$AUS"

rendere() {
  name="$1"; shift
  echo "=== $name  $(date +%H:%M) ==="
  "$BL" -b -P tools/raum_render.py -- --ziel "$AUS/${name}_roh.jpg" --proben "$PROBEN" "$@" \
    2>&1 | grep -iE "Saved|Traceback|Error" | tail -2
  if [ -f "$AUS/${name}_roh.jpg" ]; then
    UV_THREADPOOL_SIZE=1 npx tsx scripts/raum-nachbearbeiten.ts \
      "$AUS/${name}_roh.jpg" "$AUS/${name}.jpg" 0.9 >/dev/null 2>&1
    mv "$AUS/${name}_roh.json" "$AUS/${name}.json" 2>/dev/null
    rm -f "$AUS/${name}_roh.jpg"
    echo "fertig: $AUS/${name}.jpg  $(date +%H:%M)"
  fi
}

rendere studio_dunkel  --bauart studio --boden 4A4B4E --wand E7E6E4 --bodensatz Tiles141_1K-JPG   --glanz 0.14
rendere studio_hell    --bauart studio --boden 9B9A97 --wand F2F1EF --bodensatz Concrete046_1K-JPG --glanz 0.12 --bodenrauheit 0.30
rendere studio_weiss   --bauart studio --boden C9C8C5 --wand F7F7F6 --bodensatz Concrete046_1K-JPG --glanz 0.10 --bodenrauheit 0.34
rendere studio_anthrazit --bauart studio --boden 33343A --wand DEDEDC --bodensatz Tiles141_1K-JPG --glanz 0.16 --bodenrauheit 0.20
rendere halle_gross    --bauart showroom --boden 8E8B86 --wand E9E9EB --glanz 0.16

echo "ALLES FERTIG $(date +%H:%M)"
