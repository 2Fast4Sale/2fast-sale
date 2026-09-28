# Preis und Strategie für 2Fast4Sale

Stand: 29. September 2026. Alle Kosten sind gemessen, nicht geschätzt;
alle Marktpreise stammen von den Seiten der Anbieter und sind unten
verlinkt.

---

## 1. Was deine Arbeit dich wirklich kostet

Gemessen an der Gemini-Abrechnung vom 22. bis 28. September: 9,37 € für
rund 150 Bildaufrufe. Das sind **6 bis 13 Cent je Studio-Bild** — je
nachdem, wie viele der 186 Anfragen tatsächlich Bilder erzeugt haben.
Ich rechne unten mit 10 Cent als Mittelwert.

Dazu kommen aus der Datenbank (`api_costs`, 137 echte Aufrufe):

| Schritt | Kosten |
|---|---|
| Fahrzeugschein auslesen | 3,75 Cent |
| Ausstattung aus Fotos | 0,82 Cent |
| Beschreibung schreiben | 0,75 Cent |
| **Summe Text und Daten** | **rund 6 Cent** |

Stripe nimmt bei einer Einzelzahlung etwa 25 Cent plus 1,5 Prozent.

### Kosten je Inserat, bei 10 € Verkaufspreis

| Studio-Bilder | Kosten gesamt | Es bleibt |
|---|---|---|
| 8 | 0,94 – 1,50 € | 8,50 – 9,06 € |
| 10 | 1,06 – 1,76 € | 8,24 – 8,94 € |
| 12 | 1,18 – 2,02 € | 7,98 – 8,82 € |
| 20 | 1,66 – 3,06 € | 6,94 – 8,34 € |
| 30 | 2,26 – 4,36 € | 5,64 – 7,74 € |

**Die wichtigste Zeile ist die letzte.** Wenn wirklich alle 30 Fotos
durchs Studio laufen, bleiben im schlechtesten Fall 5,64 €. Deshalb ist
die Trennung zwischen Außenaufnahmen (Studio) und Innenraum, Motorraum,
Felgen, Serviceheft (kein Studio) kein Detail, sondern deine Marge.

---

## 2. Was andere verlangen

| Anbieter | Preis | Leistung |
|---|---|---|
| Autaxo Studio, Paket XS | 0,60 € je Bild (50 für 15 €) | nur freistellen und Hintergrund |
| Autaxo Studio, Paket L | 0,40 € je Bild (1.000 für 199 €) | dasselbe, größere Menge |
| Autaxo DMS-Abos | 49 / 79 / 149 € im Monat | 35 / 75 / 150 Bilder inklusive |
| Picture Instruments | rund 8 Cent je Bild im Abo | Software, die Arbeit macht der Händler |
| AutoPult | 99 / 249 / 449 € im Monat | ganzes Händlersystem, KI enthalten |
| CARMERA | Preis auf Anfrage | App für Händler, über 1.700 Autohäuser |

**Auf zehn Studio-Bilder gerechnet:** Autaxo kostet 4,00 € bis 6,00 € —
und liefert nur Bilder. Kein ausgelesener Fahrzeugschein, keine
Ausstattung, kein Text, kein Export.

### Was ein Händler ohnehin zahlt

- **mobile.de**, kleiner Händler mit 11 bis 15 Fahrzeugen:
  **389,99 € bis 649,99 € im Monat**, also 26 € bis 59 € je Inserat.
  Ab April 2026 wurde erneut erhöht.
- **AutoScout24**: neues, leistungsabhängiges Modell 2026, für viele
  Händler 25 bis 30 Prozent teurer. Der ZDK hat öffentlich kritisiert.

**Das ist dein wichtigstes Verkaufsargument.** Ein Händler, der 30 €
Plattformgebühr je Inserat zahlt, entscheidet nicht zwischen 8 € und
12 € — er entscheidet, ob das Inserat verkauft. Zehn Euro sind ein
Drittel dessen, was ihn allein die Sichtbarkeit kostet.

---

## 3. Empfehlung zum Preis

**Bleib bei 10 € je Inserat.** Die Zahl ist gegenüber dem Markt gut
begründbar:

- Nur die Bilder kosten beim Wettbewerb 4 bis 6 €.
- Dazu kommen bei dir Fahrzeugschein, Ausstattung, Text und Export.
- Wer es von Hand macht, braucht eine halbe Stunde je Fahrzeug.
- Die Plattformgebühr des Händlers ist drei- bis sechsmal so hoch.

**Was ich ändern würde: die Grundgebühr.**

| Kunde | mit 50 € Grundgebühr | ohne |
|---|---|---|
| 5 Inserate im Monat | 20 € je Inserat | 10 € |
| 10 Inserate | 15 € je Inserat | 10 € |
| 30 Inserate | 11,67 € je Inserat | 10 € |

Für den kleinen Händler, also genau deine Zielgruppe mit 10 bis 30
Fahrzeugen, verdoppelt die Grundgebühr den Preis. Sie ist die höchste
Hürde beim ersten Ja.

**Vorschlag:** Grundgebühr streichen, dafür einen klaren Satz:
„10 € je Inserat. Keine Grundgebühr, keine Laufzeit, keine
Mindestabnahme." Deine Fixkosten sind ohnehin klein — Vercel und
Supabase laufen im kostenlosen Bereich, bis echte Last kommt.

Rechnerisch verlierst du wenig: Bei 20 Inseraten im Monat bringt die
Grundgebühr 50 €, die Inserate selbst 170 €. Wenn die Grundgebühr auch
nur zwei Kunden abschreckt, hat sie sich nie gelohnt.

---

## 4. Wann sich DAT rechnet

Angebot von Herrn Weiermann: 950 € einmalig für den Workshop, dann
200 € Partnerschaft plus 154 € Lizenz — zusammen **354 € im Monat**.

Bei 10 € je Inserat und 10 Studio-Bildern bleiben dir 8,54 € je
Inserat. Damit:

| Inserate im Monat | Ergebnis mit DAT |
|---|---|
| 10 | −219 € |
| 20 | −133 € |
| 40 | **+38 €** |
| 60 | +208 € |
| 100 | +550 € |

**Die Schwelle liegt bei 40 Inseraten im Monat.** Darunter zahlt die
Partnerschaft drauf, darüber trägt sie sich.

Bis dahin: Fahrzeugschein auslesen, Ausstattung aus den Fotos, Datenblatt
fotografieren. Das kostet dich 6 Cent statt 354 € im Monat.

**Was du trotzdem tun solltest:** Herrn Weiermann nach den
Schnittstellenpartnern aus seinem Punkt 1 fragen. Wer Datenpunkte je
Abruf verkauft, kostet dich nur bei echter Nutzung — das passt zu einem
Modell, das je Inserat abrechnet, und hat keine Schwelle bei 40.

---

## 5. Was noch zu tun ist, nach Wirkung sortiert

**Erstens: Die ersten drei Händler.** Ohne Kunden ist jede Zahl hier
Theorie. Biete drei Händlern das erste Inserat kostenlos an, gegen die
Erlaubnis, die Bilder auf deiner Seite zu zeigen. Ein Vorher-Nachher
verkauft besser als jeder Text.

**Zweitens: Vorher-Nachher auf die Startseite.** Du hast inzwischen
echte Ergebnisse. Zwei Bilder nebeneinander — Handyfoto auf dem Hof,
fertiges Studiobild — sagen mehr als die ganze Feature-Seite.

**Drittens: Die Zeit messen.** Nimm beim ersten Händler die Stoppuhr:
wie lange braucht er für ein Inserat von Hand, wie lange mit dir. Die
Differenz ist dein Preis, und dann ist sie eine Zahl statt einer
Behauptung.

**Viertens: Kosten im Blick behalten.** Der Gemini-Preis ist der einzige
Posten, der dir davonlaufen kann. Auf `/dashboard/admin/costs` steht der
Median je Inserat. Wenn er über 2 € steigt, bau eine Grenze ein: nur
das Titelbild und die Außenansichten durch Gemini, der Rest über den
eigenen Weg, der nichts kostet.

**Fünftens: Ausgabenobergrenze bei Google setzen.** Dein Guthaben liegt
bei 0,63 €. Eine Obergrenze von 15 € im Monat schützt dich vor einem
Programmierfehler, der in einer Schleife Bilder erzeugt.

**Sechstens: Der Ausstattungs-Raster in Schritt 1.** Alle 133 Merkmale
als Liste mit Häkchen, vorausgefüllt aus Schein, Fotos und Dokument.
Das ist der Punkt, an dem sich „Werkzeug" von „Formular" unterscheidet.

---

## Quellen

- Autaxo Studio, Preise: https://autaxo.studio/fahrzeugbilder-freistellen
- AutoPult, Tarife: https://autopult.de/preise
- Picture Instruments, Car Photography AI: https://www.autohaus.de/nachrichten/autohandel/ki-machts-moeglich-fahrzeugbilder-mit-studioeffekten-3687383
- CARMERA: https://www.carmera.eu/
- mobile.de Preiserhöhung 2026: https://www.kfz-betrieb.vogel.de/mobilede-erhoeht-auch-2026-drastisch-die-preise-fuer-haendler-a-833fb794a3fc196a1c37c2c4627f0dff/
- AutoScout24 Preismodell 2026: https://sayedi-autohandel.de/news/autoscout24-preiserhoehung-2026-zdk-kritik-privatverkauf/
