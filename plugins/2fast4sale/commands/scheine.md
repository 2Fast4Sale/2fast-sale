---
description: Fahrzeugscheine auslesen und Feld für Feld gegen die wahrheit.csv prüfen
argument-hint: "[ordner]"
allowed-tools: Bash(npx tsx scripts/schein-test.ts:*), Read, Glob
---

Miss, wie zuverlässig Schritt 1 den Fahrzeugschein ausliest.

Ordner: `${1:-tools/proben/scheine}`

Gehe so vor:

1. Prüfe, ob im Ordner Fotos liegen und ob es eine `wahrheit.csv` gibt.
   Fehlt sie, erinnere mich an den Aufbau:

   ```
   datei;marke;fin;erstzulassung;ps;hubraum;kraftstoff;farbe
   ```

   und daran, dass Halterdaten auf den Fotos abgedeckt sein müssen.
2. Sag mir vorher, was der Lauf ungefähr kostet: jedes Foto ist ein
   Aufruf des Sprachmodells, wenige Cent je Schein.
3. Starte dann:

   ```
   npx tsx scripts/schein-test.ts <ordner>
   ```

4. Fasse das Ergebnis zusammen: Trefferquote je Feld, und jede
   Abweichung einzeln mit gelesenem und erwartetem Wert.
5. Sag mir bei jeder Abweichung deine Einschätzung, ob das Foto schuld
   ist (unscharf, verdeckt) oder die Erkennung.
