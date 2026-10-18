#!/usr/bin/env bash
# Die restlichen drei Raeume. Eigene Datei, damit ein laufender Lauf
# nie wieder von einer Bearbeitung getroffen wird — bash liest ein
# Skript waehrend der Ausfuehrung weiter, und eine Aenderung mitten im
# Lauf hat genau das gerade abgebrochen.
set -u
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
AUS="C:/Users/admin/2fast-sale/tools/proben/raeume_neu"
PROBEN=${PROBEN:-128}
mkdir -p "$AUS"

rendere() {
  name="$1"; shift
  echo "=== $name $(date +%H:%M) ==="
  "$BL" -b -P tools/raum_render.py -- --ziel "$AUS/${name}_roh.jpg" --proben "$PROBEN" "$@" 2>&1 \
    | grep -iE "Saved|Traceback|Error" | tail -2
}

rendere studio_weiss     --bauart studio --boden C9C8C5 --wand F7F7F6 --bodensatz Concrete046_1K-JPG --glanz 0.10 --bodenrauheit 0.34
rendere studio_anthrazit --bauart studio --boden 33343A --wand DEDEDC --bodensatz Tiles141_1K-JPG   --glanz 0.16 --bodenrauheit 0.20
rendere halle_gross      --bauart showroom --boden 8E8B86 --wand E9E9EB --glanz 0.16
echo "ALLES FERTIG $(date +%H:%M)"
