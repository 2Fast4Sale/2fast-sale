---
description: Freistellverfahren am selben Fotostapel vergleichen und mit Zahlen belegen
argument-hint: "[ordner] [verfahren...]"
allowed-tools: Bash(npx tsx scripts/freistell-vergleich.ts:*), Read, Glob
---

Vergleiche Freistellverfahren an denselben Fotos, statt nach Gefühl zu
urteilen.

Ordner: `${1:-tools/proben/eingang}`
Verfahren: `${2:-ormbg}` (möglich: ormbg, birefnet)

Wichtig vorab:

- **ormbg** ist ein Modell für MENSCHEN ("optimized for images with
  humans"). Es ist nur noch als Rückfall im Browser im Einsatz.
- **U-2-Net** (Apache-2.0) macht das Freistellen heute auf dem Server:
  rund 6 Sekunden je Foto, 0,9 GB Speicher.
- **BiRefNet lite** ist am saubersten, braucht aber 2,3 GB und läuft
  deshalb nicht auf Vercel.

Gehe so vor:

1. Frag mich, ob ich gerade am Rechner arbeite. Wenn ja, warte — der
   Lauf macht einen Zweikerner spürbar langsam.
2. Starte den Vergleich:

   ```
   npx tsx scripts/freistell-vergleich.ts <ordner> tools/proben/vergleich <verfahren...>
   ```

3. Lies `tools/proben/vergleich/vergleich.csv` und stelle die Verfahren
   gegenüber: wie viele Fotos brauchbar, Saum, Löcher, Sekunden je Foto.
4. Sag klar, welches Verfahren gewinnt — und ob der Unterschied groß
   genug ist, um etwas umzubauen.
