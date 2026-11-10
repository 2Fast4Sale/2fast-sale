# Bordbuch

Werkzeug für alle, die Autos reparieren — privat oder im kleinen Betrieb.
Termine, Preise, Papier und die Historie des Fahrzeugs an einer Stelle.

Der Unterschied zu Werkstattsoftware: **keine fremden Arbeitswerte.** Du legst
deinen eigenen Stundensatz fest, trägst die Dauer ein, der Preis rechnet sich
anteilig.

    Stundensatz 60 €/h  ×  40 min  =  40 €  +  Teile

## Loslegen

`index.html` im Browser öffnen. Kein Build, kein npm, keine Anmeldung.
Alles liegt im Browser des Geräts (`localStorage`), Beispieldaten sind beim
ersten Öffnen da und in den Einstellungen zurücksetzbar.

In VS Code: Rechtsklick auf `index.html` → *Open with Live Server*
(Extension „Live Server").

## Was drin ist

- **Kalender** — Wochenleiste mit Wochentagen und Auslastungsbalken pro Tag,
  Monatsübersicht, Kalenderwoche, Blättern. Der gewählte Tag zeigt seine
  Termine mit Von-Bis-Zeit und die freien Fenster dazwischen. Aus einem Termin
  entsteht per Knopf ein Auftrag.
- **Auftrag** — Kopf mit Fahrzeug, Kunde und Gesamtbetrag; Arbeit und Teile als
  getrennte Abschnitte mit Zwischensummen; eine Eingabekarte mit Umschalter
  Preisbuch / Arbeit / Teil.
- **Verlauf** — alle Reparaturen nach Datum oder nach Fahrzeug. Die
  Fahrzeug-Ansicht ist das digitale Scheckheft: Anzahl, Summe, höchster
  erfasster Kilometerstand. Dazu Kennzahlen inklusive offener Beträge und eine
  Suche über Fahrzeug, Kunde und Arbeit.
- **Preisbuch** — eigene Positionen mit Dauer, Stundensatz und Teileliste. Ein
  Tipp setzt Arbeit und Teile zusammen in den Auftrag.
- **Dauer-Schätzung** — Arbeit + Fahrzeugklasse ergibt einen Vorschlag in
  Minuten. Die Werte stehen in `JOBS` in der Datei (rund 48 Arbeiten), die
  Fahrzeugklasse wird aus dem Modellnamen geraten und multipliziert
  (Kleinwagen 0,9 bis Oldtimer 1,45).
- **Timer** — echte Dauer mitschreiben, Abweichung zur Kalkulation anzeigen,
  Ist-Wert ins Preisbuch übernehmen.
- **Teilepreise** — für Teile gibt es bewusst *keinen* festen Preis.
  Gespeichert wird nur, was zuletzt bezahlt wurde, mit Datum. Im Auftrag ist
  das vorbelegt und in der Zeile änderbar; ein Teil ohne bekannten Preis steht
  als „Preis offen" drin und die Gesamtsumme sagt, dass sie unvollständig ist.
  Jeder eingetragene Preis wandert als neuer „zuletzt"-Wert zurück. Optional
  ein Aufschlag in Prozent auf den Einkauf.
- **Zahlung** — Bar, Überweisung oder EC-Karte, offen oder bezahlt mit Datum.
  Danach richtet sich der Text auf dem Papier; bei bezahlter Barzahlung gilt
  die Rechnung zugleich als Quittung.

## Die drei Dokumente

Jeweils als Bildschirmansicht und als PDF (jsPDF, A4, Anschriftenfeld nach
DIN 5008, Seitenumbruch mit wiederholtem Tabellenkopf).

1. **Kostenvoranschlag** — für Arbeit, die noch nicht gemacht ist. Eigene
   Nummernreihe, Gültigkeitsdatum, Summe als „Voraussichtlich", im Text
   ausdrücklich „Es wurde noch keine Arbeit ausgeführt" samt Klausel zu
   Abweichungen bis 15 %. Der Knopf *Angenommen* legt den Termin auf den
   nächsten freien Platz, hängt ihn an den Auftrag und merkt sich die Summe.
   Danach zeigt der Auftrag die Abweichung in Prozent und warnt ab 15 %.
2. **Kostenaufstellung** — für die private Hilfeleistung. Ohne Steuernummer,
   ohne Umsatzsteuerausweis, mit Vermerk. Optional mit Haftungshinweis.
3. **Rechnung** — gewerblich. Rechnungsnummer (einmal vergeben, danach fest),
   Betriebsdaten, 19 % USt oder Hinweis nach § 19 UStG, Zahlungsziel und IBAN
   nur bei Überweisung, Prüfliste der Pflichtangaben nach § 14 UStG. Fehlt
   etwas, verweigert der Knopf die Rechnung und nennt es.

### Warum die Sorten getrennt sind

Wer als Privatperson Umsatzsteuer auf ein Papier schreibt, schuldet sie dem
Finanzamt (§ 14c UStG). Darum hat die private Sorte das Feld gar nicht, statt
es nur leer zu lassen.

## Haftung

Die private Kostenaufstellung kann einen Haftungshinweis tragen (abschaltbar):
Gefälligkeit ohne Gewinnerzielungsabsicht, keine Gewährleistung, Haftung für
Sachschäden auf Vorsatz und grobe Fahrlässigkeit beschränkt, Körperschäden
ausgenommen. Das trägt nur, wenn die Arbeit wirklich privat und ohne Gewinn
erfolgt; ein Betrieb kann die Gewährleistung gegenüber Privatkunden nicht
ausschließen. Kein Rechtsrat.

Nicht gebaut und nicht vorgesehen: ein Papier, das nach erledigter Arbeit
aussieht, obwohl nichts gemacht wurde. Das täuscht den Leser und schützt auch
nicht — Haftung entsteht aus der Arbeit, nicht aus dem Dokument. Wer nichts
gemacht hat, schreibt einen Kostenvoranschlag.

## Offen vor echtem Einsatz

Sobald ein Betrieb damit wirklich abrechnet, gelten die GoBD: fortlaufende
Nummern ohne Lücken, keine nachträgliche Änderung oder Löschung erstellter
Rechnungen, zehn Jahre Aufbewahrung, Export für die Betriebsprüfung. Die
Nummer sitzt schon fest, der Rest nicht — das gehört gebaut, bevor dafür Geld
genommen wird. Für Kleinunternehmer nach § 19 ist die Hürde niedriger.

## Als nächstes

- Alles nachträglich änderbar machen: Termin verschieben, Arbeitsdauer
  korrigieren (bei Teilen geht es schon).
- Kundenbuchung: öffentliche Seite mit freien Slots. Die Tagesauslastung und
  die Öffnungszeiten sind die Grundlage dafür.
- Preis-Historie je Teil statt nur des letzten Werts.
- Dauer-Schätzung aus echten Daten statt aus der Tabelle: jeder gestoppte
  Timer ist ein Datenpunkt.

## Technik

Eine Datei, kein Build. Vanilla JavaScript, keine Abhängigkeit außer jsPDF
(von cdnjs, nur für die PDFs). Zustand in `localStorage` unter dem Schlüssel
`bordbuch.v1`.
