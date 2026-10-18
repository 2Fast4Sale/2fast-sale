#!/usr/bin/env bash
#
# Raeume mit echtem Licht.
#
# ── Worum es geht ──────────────────────────────────────────────────────
#
# Die 21 veroeffentlichten Raeume sind mit erfundenem Licht gerechnet:
# rechteckige Flaechenlampen, gleichmaessig, und nichts, was sich im Lack
# spiegeln koennte. Lack lebt aber von Spiegelung — ohne Umgebung bleibt
# er stumpf, und genau daran sieht man jedem Bild an, dass es gebaut ist.
#
# Die Dateien unter tools/hdri sind Rundum-Aufnahmen echter Raeume von
# Poly Haven (CC0, gemeinfrei, auch gewerblich, ohne Namensnennung).
# Sie liegen seit Wochen da und wurden von keinem veroeffentlichten Raum
# benutzt.
#
# Zwei Wege stehen zur Wahl, und dieser Lauf rechnet beide klein, damit
# man sie nebeneinander ansehen kann:
#
#   A) echtraum  — die Aufnahme IST der Hintergrund. Echte Wand, echter
#      Boden, echtes Licht. Nichts konstruiert. Offene Frage ist die
#      Schaerfe: Aus einer 4k-Rundumaufnahme schneidet ein 50-mm-Blick
#      nur rund ein Zehntel heraus, und das muss auf 1920 Punkte Breite
#      reichen.
#
#   B) gebauter Raum + echtes Licht — die Geometrie bleibt scharf
#      (gerechnet, also beliebig fein), und die Aufnahme liefert
#      Spiegelung und weiches Licht. Kein Schaerfeproblem, aber auch
#      kein echter Hintergrund.
#
# Aufruf:
#   PROBEN=24 SKALA=50 bash tools/raeume_echt.sh      (Probelauf, schnell)
#   PROBEN=128 SKALA=100 bash tools/raeume_echt.sh    (Endfassung)
#
set -u
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
AUS="$(cd "$(dirname "$0")/.." && pwd)/tools/proben/raeume_echt"
HDRI="$(cd "$(dirname "$0")/.." && pwd)/tools/hdri"
PROBEN=${PROBEN:-24}
SKALA=${SKALA:-50}
mkdir -p "$AUS"

rendere() {
  name="$1"; shift
  echo "=== $name  $(date +%H:%M:%S) ==="
  # -t 1: Der Rechner hat zwei Kerne. Mit beiden ist er waehrend des
  # Laufs unbenutzbar, und nebenher laeuft oft noch ein Bildstapel.
  "$BL" -b -t "${KERNE:-1}" -P tools/raum_render.py -- \
    --ziel "$AUS/${name}.jpg" --proben "$PROBEN" --skala "$SKALA" "$@" \
    2>&1 | grep -iE "Saved|Traceback|Error|fertig" | tail -2
}

# ── A) Die Aufnahme als Hintergrund ───────────────────────────────────
#
# Die Drehung sucht eine ruhige Wand hinter dem Fahrzeug. Die Werte sind
# geraten und muessen am Bild nachgezogen werden — deshalb dieser
# Probelauf.
rendere echt_autohaus   --bauart echtraum --hdri "$HDRI/newman_lobby_4k.hdr"        --lichtdrehung 0   --kamerahoehe 1.45 --brennweite 40
rendere echt_halle      --bauart echtraum --hdri "$HDRI/empty_warehouse_01_4k.hdr"  --lichtdrehung 90  --kamerahoehe 1.50 --brennweite 40
rendere echt_werkstatt  --bauart echtraum --hdri "$HDRI/autoshop_01_4k.hdr"         --lichtdrehung 180 --kamerahoehe 1.45 --brennweite 40
rendere echt_museum     --bauart echtraum --hdri "$HDRI/sculpture_exhibition_4k.hdr" --lichtdrehung 0  --kamerahoehe 1.50 --brennweite 40
rendere echt_studio     --bauart echtraum --hdri "$HDRI/white_studio_01_4k.hdr"     --lichtdrehung 0   --kamerahoehe 1.40 --brennweite 50

# ── B) Gebauter Raum, echtes Licht ────────────────────────────────────
#
# Dieselben Raeume wie bisher, nur mit Umgebung. Zum Vergleich steht
# daneben jeweils die Fassung ohne HDRI (das ist der veroeffentlichte
# Stand unter public/backgrounds/raum).
rendere gebaut_studio_weiss --bauart studio   --boden C9C8C5 --wand F7F7F6 --bodensatz Concrete046_1K-JPG --glanz 0.10 --bodenrauheit 0.34 --hdri "$HDRI/white_studio_01_4k.hdr" --lichtstaerke 1.0
rendere gebaut_studio_klein --bauart studio   --boden 4A4B4E --wand E7E6E4 --bodensatz Tiles141_1K-JPG   --glanz 0.14 --hdri "$HDRI/studio_small_09_4k.hdr" --lichtstaerke 1.0
rendere gebaut_halle        --bauart showroom --boden 8E8B86 --wand E9E9EB --glanz 0.16 --hdri "$HDRI/empty_warehouse_01_4k.hdr" --lichtstaerke 0.35
rendere gebaut_galerie      --bauart galerie  --boden 3A3B3E --wand F4F4F3 --bodensatz Concrete034_1K-JPG --glanz 0.20 --hdri "$HDRI/newman_lobby_4k.hdr" --lichtstaerke 0.35

echo "ALLES FERTIG $(date +%H:%M:%S) — $AUS"
