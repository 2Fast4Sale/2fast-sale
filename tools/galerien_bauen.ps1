# Rendert die Galerie-Raeume in vielen Varianten.
#
#   powershell -File tools\galerien_bauen.ps1
#
# Alle mit Cycles — diese Raeume leben von echtem Licht (Lichtboegen,
# Spiegelung im Boden, dunklere Ecken). Rechenzeit auf zwei Kernen: rund
# 15 bis 20 Minuten je Raum. Laeuft am besten ueber Nacht.
#
# Spalten: Name, Wand, Boden, Glanz, Extras
#   fenster      Fensterfront in der linken Haelfte der Rueckwand
#   waben_wand   Sechseck-Paneele mit Lichtfugen auf der Rueckwand
#   waben_decke  Sechseck-Paneele an der Decke als Hauptlicht
#   led          LED-Linien in der Decke
#   (leer)       Einbaustrahler mit Lichtboegen an der Wand

$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$skript  = "$PSScriptRoot\raum_render.py"
$ziel    = "$PSScriptRoot\..\public\backgrounds\raum"

$raeume = @(
  @("fenster_waben",       "C9CCD2", "9DA3AB", 0.10, "fenster,waben_wand,waben_decke"),
  @("fenster_hell",        "EEEEEC", "8E8C88", 0.08, "fenster"),
  @("fenster_dunkel",      "E6E6E4", "2E2D2C", 0.10, "fenster"),
  @("waben_dunkel",        "D8D9DC", "2C2B2A", 0.10, "waben_wand,waben_decke"),
  @("waben_hell",          "E4E6EA", "A6AAB0", 0.10, "waben_wand"),
  @("led_dunkel",          "E8E8E6", "2A2928", 0.10, "led"),
  @("led_fenster",         "EDEDEB", "7E7C78", 0.08, "fenster,led"),
  @("galerie_waben",       "F2F2F0", "3A3836", 0.10, "waben_wand")
)

foreach ($r in $raeume) {
  $name = $r[0]
  Write-Host ">> $name  [$($r[4])]" -ForegroundColor Cyan
  & $blender -b -P $skript -- `
    --ziel "$ziel/$name.jpg" --bauart galerie `
    --wand $r[1] --boden $r[2] --bodensatz "Concrete034_1K-JPG" `
    --glanz $r[3] --extras $r[4] --maschine cycles --proben 40 2>&1 |
    Select-String -Pattern "fertig|ERROR|Traceback" | Out-Host
  if (Test-Path "$ziel/$name.jpg") { Write-Host "   ok" -ForegroundColor Green }
  else { Write-Host "   FEHLT" -ForegroundColor Red }
}
Write-Host "fertig - $($raeume.Count) Galerie-Raeume" -ForegroundColor Green
