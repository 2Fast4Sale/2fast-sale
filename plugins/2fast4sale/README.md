# 2Fast4Sale-Werkzeuge

Slash-Befehle für die Prüfskripte des Projekts. Sie ersetzen keine
Fähigkeit von Claude Code — sie sparen nur das Merken langer Befehle und
sorgen dafür, dass jeder Lauf gleich abläuft und gleich ausgewertet wird.

## Einbauen

Im Terminal, im Ordner des Projekts:

```
/plugin marketplace add C:\Users\admin\2fast-sale
/plugin install 2fast4sale@2fast4sale-werkzeuge
```

Danach Claude Code einmal neu starten.

## Befehle

| Befehl | Wofür |
|---|---|
| `/stapel [ordner] [raum]` | Ganzen Fotoordner durch die Bildverarbeitung jagen, Auffälliges melden |
| `/freistellen [ordner] [verfahren]` | Freistellverfahren am selben Stapel vergleichen |
| `/kennzeichen [bild] [firma]` | Kennzeichenerkennung und Ersatzschild prüfen |
| `/scheine [ordner]` | Fahrzeugscheine auslesen und gegen `wahrheit.csv` messen |
| `/raeume [bild]` | Ein Fahrzeug in alle Showrooms setzen |

## Zwei Regeln, die in den Befehlen stecken

1. **Ein Rechenkern.** Der Entwicklerrechner hat zwei; ein Stapellauf mit
   allen Kernen hat ihn schon einmal unbenutzbar gemacht.
2. **Erst messen, dann urteilen.** Jeder Befehl endet mit Zahlen aus einer
   CSV und einem Blick auf die Bilder, nicht mit einem Gefühl.
