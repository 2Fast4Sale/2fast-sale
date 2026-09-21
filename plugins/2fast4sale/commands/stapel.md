---
description: Ganzen Fotoordner durch die Bildverarbeitung jagen und auffällige Bilder melden
argument-hint: "[ordner] [raum]"
allowed-tools: Bash(npx tsx scripts/stapel-test.ts:*), Read, Glob
---

Prüfe einen ganzen Ordner Fahrzeugfotos mit der echten Bildverarbeitung.

Ordner: `${1:-tools/proben/eingang}`
Raum: `${2:-galerie_dunkel}`

Gehe so vor:

1. Zähle zuerst die Fotos im Ordner und sag mir die Zahl sowie die
   geschätzte Dauer (rund 10 Sekunden je Foto).
2. Starte dann:

   ```
   ONNX_NUM_THREADS=1 OMP_NUM_THREADS=1 npx tsx scripts/stapel-test.ts <ordner> tools/proben/stapel_neu <raum>
   ```

   Ein Rechenkern ist Absicht: Der Rechner hat zwei, und mit allen
   Kernen ist er während des Laufs unbenutzbar.
3. Lies danach `tools/proben/stapel_neu/bericht.csv` und fasse zusammen:
   wie viele Fotos ohne Auffälligkeit, welche auffällig sind und warum.
4. Schau dir `tools/proben/stapel_neu/_uebersicht.jpg` an und schick sie
   mir mit SendUserFile.
5. Sieh dir jedes auffällige Bild einzeln an und sag mir, ob es ein
   Fehler der Software ist oder am Foto liegt.
