---
description: Kennzeichenerkennung und Ersatzschild an einem Foto prüfen
argument-hint: "[bild] [firmenname]"
allowed-tools: Bash(npx tsx scripts/kennzeichen-pruefen.ts:*), Read
---

Prüfe, ob das Kennzeichen gefunden und sauber überdeckt wird.

Bild: `${1:-tools/proben/golf.jpg}`
Firmenname fürs Ersatzschild: `${2:-Autohaus Muster}`

Gehe so vor:

1. Starte den Selbsttest ohne Argumente — er klebt ein künstliches
   Kennzeichen auf ein Foto und prüft, ob es an derselben Stelle
   wiedergefunden wird:

   ```
   npx tsx scripts/kennzeichen-pruefen.ts
   ```

   Steht dort "DANEBEN", ist die Erkennung kaputt; melde das sofort und
   mach nicht weiter.
2. Prüfe danach das genannte Bild:

   ```
   KZ_DEBUG=1 npx tsx scripts/kennzeichen-pruefen.ts <bild> tools/proben/kz_pruef.jpg "<firma>"
   ```

3. Sieh dir `tools/proben/kz_pruef.jpg` an und beurteile drei Dinge:
   Sitzt das Schild auf dem Kennzeichen? Schaut noch ein Zeichen des
   Originals heraus? Ist die Schräglage übernommen?
4. Schick mir den Bildausschnitt mit SendUserFile.
