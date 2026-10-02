# Preis und Strategie für 2Fast4Sale

Stand: 29. September 2026. Alle Kosten sind gemessen, nicht geschätzt;
alle Marktpreise stammen von den Seiten der Anbieter und sind unten
verlinkt.

---

## 0. Nachtrag vom 2. Oktober 2026 — das gilt jetzt

Zwei Dinge haben sich gegenueber dem Text unten geaendert, und beide
aendern die Zahlen in jeder folgenden Tabelle.

**Die Umsatzsteuer zaehlt mit.** Die Google-Rechnung fuer September:
7,99 € netto plus 1,60 € Umsatzsteuer, bezahlt also 9,59 €. Als
Kleinunternehmer nach § 19 UStG gibt es keinen Vorsteuerabzug — die
Steuer ist Aufwand. Ein Studio-Bild kostet damit **15,5 Cent**, nicht
10 bis 13. Unten steht ueberall der Nettopreis; rechne 20 Prozent drauf.

**Der Preis ist 7,50 € mit 15 Studio-Bildern, nicht 10 € mit 40.**
Gerechnet:

| Modell | Einkauf | Stripe | bleibt |
|---|---|---|---|
| 10,00 € mit 40 Studio-Bildern | 6,25 € | 0,40 € | 3,35 € |
| 7,50 € mit 15 Studio-Bildern | 2,39 € | 0,36 € | **4,75 €** |

Der niedrigere Preis bringt mehr, und das ist kein Trick: Vierzig
Studio-Bilder gibt es bei einem Auto nicht. Ein Fahrzeug hat zehn bis
fuenfzehn sinnvolle Aussenansichten. Cockpit, Tacho, Motorraum,
Serviceheft und Reifenprofil gehoeren nicht vor einen
Studio-Hintergrund — dort sieht er falsch aus. Ein vollstaendiges
Inserat mit 35 bis 40 Fotos ist weiter drin: Gewoehnliche Fotos sind
unbegrenzt bis zur Obergrenze von 60 und kosten nichts, weil an ihnen
nichts gerechnet wird.

**Die Pakete sind mitgewandert** (derselbe Abstand zum Einzelpreis wie
vorher, rund 15, 25 und 38 Prozent):

| | Preis | je Inserat | lohnt ab | bleibt je Inserat |
|---|---|---|---|---|
| Paket S, 50 Inserate | 320 € | 6,40 € | 37 im Monat | 4,08 € |
| Paket M, 150 Inserate | 845 € | 5,63 € | 121 im Monat | 3,31 € |
| Paket L, 550 Inserate | 2.550 € | 4,64 € | 378 im Monat | 2,32 € |

**Mehr Studio-Bilder in Stufen** — je Inserat waehlbar, und es wird
immer der fuer den Haendler guenstigere Weg berechnet (einzeln oder
Stufe):

| zusaetzlich | Aufpreis | je Bild | Einkauf | bleibt |
|---|---|---|---|---|
| einzeln | 25 ct | 25 ct | 15,5 ct | 9,5 ct |
| +10 (25 gesamt) | 2,40 € | 24 ct | 1,55 € | 0,85 € |
| +25 (40 gesamt) | 5,50 € | 22 ct | 3,87 € | 1,63 € |
| +45 (60 gesamt) | 9,00 € | 20 ct | 6,96 € | 2,04 € |

Unter 20 Cent geht keine Stufe. Der Bildpreis bei Google hat sich
zwischen Juli und September vervierfacht; eine Stufe, die bei 18 Cent
liegt, waere beim naechsten Sprung ein Verlust.

**Der Probelauf bleibt bei 5 € fuer zwei Inserate.** Mit zwoelf
Studio-Bildern je Inserat sind das 3,74 € Einkauf plus 0,33 € Stripe —
es bleiben 0,93 €. Vorher rechnete  mit 23 Cent je
Inserat und meldete 4,21 €; die 23 Cent stammten aus der Zeit, in der
ein Bild zwei Cent kosten sollte.

**Offen und deine Entscheidung:** Die 50 € Grundgebuehr werden nirgends
abgebucht, und das Monatskontingent der Pakete wird nicht geprueft —
ein Paket gibt derzeit unbegrenzt Inserate. Beides steht aber auf der
Preisseite.

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
