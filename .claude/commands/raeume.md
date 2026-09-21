---
description: Ein Fahrzeug in alle Showrooms setzen und die Übersicht zeigen
argument-hint: "[freigestelltes-bild]"
allowed-tools: Bash(npx tsx scripts/raum-katalog.ts:*), Read, Glob
---

Setze ein freigestelltes Fahrzeug in alle gerenderten Räume, um Schatten
und Einpassung zu beurteilen.

Bild: `${1:-tools/proben/urus_frei.png}` (muss einen Alphakanal haben)

Gehe so vor:

1. Prüfe, dass das Bild wirklich freigestellt ist (Alphakanal, nicht
   überall deckend). Ist es das nicht, sag es mir, statt ein sinnloses
   Ergebnis zu erzeugen.
2. Starte:

   ```
   npx tsx scripts/raum-katalog.ts <bild> public/backgrounds/raum tools/proben/raeume_neu
   ```

3. Sieh dir `tools/proben/raeume_neu/_uebersicht.jpg` an und schick sie
   mir mit SendUserFile.
4. Beurteile jeden auffälligen Raum einzeln, besonders:
   steht der Wagen auf dem Boden oder schwebt er, liegt der Schatten
   unter dem Auto, ragt etwas über die Kontur hinaus.
