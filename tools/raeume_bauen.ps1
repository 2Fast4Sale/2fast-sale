# Rendert den Satz Studioraeume, aus dem der Haendler spaeter waehlt.
#
#   powershell -File tools\raeume_bauen.ps1
#
# Jede Zeile ist ein Raum: Name, Wandfarbe, Bodenfarbe, Wandmaterial,
# Bodenmaterial, Bodenglanz, Ausstattung.
#
# Farbe und Material sind getrennt, weil dieselbe Putzkachel mit anderem
# Farbwert eine weisse, eine graue und eine anthrazitfarbene Wand ergibt.
#
# Die AUSSTATTUNG ist der Grund, warum aus acht Farbvarianten acht Raeume
# werden. Der erste Satz hatte keine: dieselbe leere Ecke, achtmal
# umgefaerbt. Das sah man sofort, und es war zu Recht die Kritik.
#
#   kreis     schmaler Ring auf dem Boden, wie die Standflaeche im Autohaus
#   podest    flache Scheibe, zwei Zentimeter hoch
#   band      dunkles Feld im unteren Teil der Wand (Sockelzone)
#   pflanzen  zwei Kuebelpflanzen, Poly Haven, CC0
#
# `glanz` landet in der .json neben dem Bild und steuert die Spiegelung
# im Kompositor. Matter Beton spiegelt nicht, polierter Estrich schwach.

$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$skript  = "$PSScriptRoot\raum_render.py"
$ziel    = "$PSScriptRoot\..\public\backgrounds\raum"

$putz    = "PaintedPlaster017_1K-JPG"
$rauputz = "Plaster001_1K-JPG"
$beton   = "Concrete046_1K-JPG"

$raeume = @(
  # Name             Wand      Boden     Wandmat.  Bodenmat.             Glanz Ausstattung
  @("weiss_klar",    "EDEDEF", "9A9791", $putz,    "Concrete046_1K-JPG", 0,    ""),
  @("weiss_kreis",   "EDEDEF", "9A9791", $putz,    "Concrete046_1K-JPG", 0,    "kreis"),
  @("weiss_gruen",   "EDEDEF", "B4B2AE", $putz,    "Concrete034_1K-JPG", 0.06, "kreis,pflanzen"),
  @("showroom_hell", "F0EDE7", "C8C6C2", $rauputz, "Tiles141_1K-JPG",    0.10, "podest,band,pflanzen"),
  @("grau_sockel",   "B9BABD", "8E8B86", $putz,    "Concrete046_1K-JPG", 0,    "band"),
  @("grau_asphalt",  "9C9DA1", "6E6E70", $putz,    "Asphalt033_1K-JPG",  0,    ""),
  @("anthrazit",     "4A4B4F", "7A7975", $rauputz, "Concrete034_1K-JPG", 0.06, "kreis"),
  @("werkstatt",     "A8A6A2", "8E8B86", $beton,   "Concrete046_1K-JPG", 0,    "pflanzen")
)

foreach ($r in $raeume) {
  $name = $r[0]
  Write-Host ">> $name  [$($r[6])]" -ForegroundColor Cyan
  # Blender beendet sich nach dem Speichern gelegentlich mit 255, obwohl
  # das Bild geschrieben ist. Deshalb wird der Rueckgabewert nicht
  # ausgewertet, sondern hinterher geprueft, ob die Datei da ist.
  & $blender -b -P $skript -- `
    --ziel      "$ziel/$name.jpg" `
    --wand      $r[1] `
    --boden     $r[2] `
    --wandsatz  $r[3] `
    --bodensatz $r[4] `
    --glanz     $r[5] `
    --schmuck   $r[6] `
    --maschine  eevee 2>&1 | Select-String -Pattern "fertig|ERROR|Traceback" | Out-Host

  if (Test-Path "$ziel/$name.jpg") {
    Write-Host "   ok" -ForegroundColor Green
  } else {
    Write-Host "   FEHLT" -ForegroundColor Red
  }
}

Write-Host "fertig - $($raeume.Count) Raeume in $ziel" -ForegroundColor Green
