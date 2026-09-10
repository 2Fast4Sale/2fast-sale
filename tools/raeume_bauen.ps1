# Rendert den Satz Studioraeume, aus dem der Haendler spaeter waehlt.
#
#   powershell -File tools\raeume_bauen.ps1
#
# Jeder Raum ist eine Zeile: Name, Wandfarbe, Bodenfarbe, Wandmaterial,
# Bodenmaterial, Bodenglanz. Farbe und Material sind getrennt, weil
# dieselbe Putzkachel mit anderem Farbwert eine weisse, eine graue und
# eine anthrazitfarbene Wand ergibt: drei Raeume aus einem Foto.
#
# `glanz` landet in der .json neben dem Bild und steuert spaeter die
# Spiegelung im Kompositor. Matter Estrich spiegelt kaum, polierter
# Beton deutlich, Asphalt gar nicht.

$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$skript  = "$PSScriptRoot\raum_render.py"
$ziel    = "$PSScriptRoot\..\public\backgrounds\raum"

$putz    = "PaintedPlaster017_1K-JPG"
$rauputz = "Plaster001_1K-JPG"
$beton   = "Concrete046_1K-JPG"

$raeume = @(
  # Name              Wand      Boden     Wandmaterial Bodenmaterial        Glanz
  @("weiss_beton",    "EDEDEF", "9A9791", $putz,       "Concrete046_1K-JPG", 0.08),
  @("weiss_glatt",    "EDEDEF", "B4B2AE", $putz,       "Concrete034_1K-JPG", 0.20),
  @("weiss_fliesen",  "EDEDEF", "C8C6C2", $putz,       "Tiles141_1K-JPG",    0.26),
  @("grau_beton",     "9C9DA1", "8E8B86", $putz,       "Concrete046_1K-JPG", 0.08),
  @("grau_asphalt",   "9C9DA1", "6E6E70", $putz,       "Asphalt033_1K-JPG",  0.02),
  @("anthrazit_glatt","4A4B4F", "7A7975", $rauputz,    "Concrete034_1K-JPG", 0.20),
  @("beton_beton",    "A8A6A2", "8E8B86", $beton,      "Concrete046_1K-JPG", 0.08),
  @("hell_warm",      "F0EDE7", "A79E92", $rauputz,    "Concrete034_1K-JPG", 0.14)
)

foreach ($r in $raeume) {
  $name = $r[0]
  Write-Host ">> $name" -ForegroundColor Cyan
  & $blender -b -P $skript -- `
    --ziel      "$ziel/$name.jpg" `
    --wand      $r[1] `
    --boden     $r[2] `
    --wandsatz  $r[3] `
    --bodensatz $r[4] `
    --glanz     $r[5] `
    --maschine  eevee 2>&1 | Select-String -Pattern "fertig|Error|Traceback"
}

Write-Host "fertig - $($raeume.Count) Raeume in $ziel" -ForegroundColor Green
