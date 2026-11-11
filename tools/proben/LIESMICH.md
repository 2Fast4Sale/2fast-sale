# Proben — der Abend, der deine Angst in eine Zahl verwandelt

Hier liegen die echten Fotos, gegen die gemessen wird. Ohne sie sind die 39
Prüfskripte im Ordner `scripts/` wertlos: das Messgerät ist gebaut, die Probe
fehlt.

Das ist Handarbeit und niemand kann sie dir abnehmen. Sie dauert einen Abend
und beantwortet die Frage, die dich gerade aufhält: **wie oft liegt die
Erkennung daneben, und wobei?**

## Was du brauchst

### 1. Fahrzeugscheine — `tools/proben/scheine/`

Mindestens **20 Stück**, besser 30. Verschiedene Marken, verschiedene Jahre,
verschiedene Lichtverhältnisse: ein paar gut ausgeleuchtet, ein paar schief
und im Halbdunkel fotografiert. Genau die schlechten zeigen, wo es bricht.

**Halterdaten abdecken** — Name und Adresse. Daumen drauf oder Zettel drüber.

Dann `wahrheit.csv` ausfüllen: für jedes Foto eine Zeile mit dem, was ein
Mensch vom Papier abliest. Leere Zellen werden übersprungen; wer nur FIN und
Leistung einträgt, misst eben nur diese zwei Felder. Besser als nichts.

Messen mit:

    npx tsx scripts/schein-test.ts tools/proben/scheine

### 2. Fahrzeugfotos — `tools/proben/eingang/`

**20 bis 40 Handyfotos** von Autos, so wie ein Händler sie macht: Hof,
Straßenrand, Halle, Gegenlicht, Pfütze, Zaun im Hintergrund. Keine
Hochglanzbilder — die funktionieren immer.

Freistellverfahren vergleichen:

    npx tsx scripts/freistell-vergleich.ts tools/proben/eingang

Ganzen Stapel durch die Verarbeitung:

    npx tsx scripts/stapel-test.ts tools/proben/eingang

### 3. Ausstattung — `tools/proben/ausstattung/`

Für 10 Fahrzeuge je ein Satz Fotos plus die **tatsächliche Ausstattungsliste**
aus den Unterlagen. In `wahrheit-ausstattung.csv` eintragen, ein Merkmal je
Zeile.

Hier zählt beides: was erkannt wurde und nicht da ist (das ist das teure),
und was da ist und nicht erkannt wurde (das ist nur ärgerlich).

## Was du mit dem Ergebnis machst

Nicht "gut" oder "schlecht" notieren, sondern je Feld eine Quote. Danach
weißt du:

- **über 95 %** — das Feld kann vorbelegt werden
- **80 bis 95 %** — vorbelegen, aber als Vorschlag markiert, der Händler
  bestätigt
- **unter 80 %** — gar nicht erst anzeigen, sonst kostet es Vertrauen

Diese drei Schwellen sind die eigentliche Produktentscheidung. Ohne Zahlen
triffst du sie nach Gefühl.

## Warum das wichtiger ist als die Trefferquote selbst

Steht im Kopf von `scripts/schein-test.ts`: Was hier falsch gelesen wird,
steht als Zusicherung im Inserat. 81 kW statt 110, ein Dreher in der FIN, das
falsche Erstzulassungsdatum. **Der Händler haftet dafür.** Ein einziger
solcher Fall, und er kündigt und erzählt es weiter.

Deshalb ist die Antwort nie "das Modell wird schon stimmen", sondern: jedes
erkannte Merkmal kommt mit seiner Quelle und wird bestätigt, bevor es ins
Inserat geht.
