# Schrauberzettel

Eigenes Projekt, unabhängig von 2Fast4Sale. Nichts in diesem Ordner greift auf
den Code der Hauptanwendung zu.

## Idee

Werkzeug für Leute, die Autos reparieren — privat oder im kleinen Betrieb.
Der entscheidende Unterschied zu Werkstattsoftware: **keine fremden
Arbeitswerte.** Der Nutzer legt seinen eigenen Stundensatz fest, trägt die
Dauer ein, und der Preis rechnet sich anteilig.

    Stundensatz 60 €/h  ×  40 min  =  40 €  +  Teile

## Was der Prototyp kann

`prototyp.html` — eine Datei, ohne Build, im Browser öffnen.

- **Kalender** — Wochenleiste mit Wochentagen und Auslastungsbalken pro Tag,
  Monatsübersicht mit Punkten je Termin, Kalenderwoche und Blättern.
  Der gewählte Tag zeigt seine Termine mit Von-Bis-Zeit und die freien
  Fenster dazwischen. Aus einem Termin entsteht per Knopf ein Auftrag.
- **Auftrag** — Kopf mit Fahrzeug, Kunde und Gesamtbetrag; Arbeit und Teile
  als getrennte Abschnitte mit Zwischensummen; eine Eingabekarte mit
  Umschalter Preisbuch / Arbeit / Teil.
- **Preisbuch** — eigene Positionen mit Dauer, Stundensatz und Teileliste.
  Ein Tipp setzt Arbeit und Teile zusammen in den Auftrag.
- **Teilepreise** — fuer Teile gibt es bewusst *keinen* festen Preis.
  Gespeichert wird nur, was zuletzt dafuer bezahlt wurde, mit Datum. Beim
  Uebernehmen in den Auftrag ist dieser Wert vorbelegt und in der Zeile
  aenderbar; ein Teil ohne bekannten Preis steht als "Preis offen" drin und
  die Gesamtsumme sagt, dass sie noch unvollstaendig ist. Jeder eingetragene
  Preis wandert als neuer "zuletzt"-Wert ins Preisbuch zurueck. Optional ein
  Aufschlag in Prozent: dann bekommt jede Teile-Zeile ein Feld fuer den
  Einkauf und der Verkaufspreis wird daraus vorgeschlagen.
- **Dauer-Schätzung** — Arbeit + Fahrzeugklasse ergibt einen Vorschlag in
  Minuten. Die Werte stehen in `JOBS` in der Datei (Erfahrungswerte, rund 48
  Arbeiten), die Fahrzeugklasse wird aus dem Modellnamen geraten und
  multipliziert (Kleinwagen 0,9 bis Oldtimer 1,45).
- **Verlauf** — alle bisherigen Reparaturen, wahlweise nach Datum (nach
  Jahren gruppiert) oder nach Fahrzeug. Die Fahrzeug-Ansicht ist das
  digitale Scheckheft: je Fahrzeug die Anzahl der Reparaturen, die Summe
  und der hoechste erfasste Kilometerstand. Dazu drei Kennzahlen oben und
  eine Suche ueber Fahrzeug, Kunde und Arbeit.
- **Timer** — echte Dauer mitschreiben, Abweichung zur Kalkulation anzeigen,
  Ist-Wert ins Preisbuch übernehmen.
- **Dokument** — zwei getrennte Sorten:
  - *Kostenaufstellung* für privat: ohne Steuernummer, ohne
    Umsatzsteuerausweis, mit Vermerk zur privaten Hilfeleistung.
  - *Rechnung* für gewerblich: Rechnungsnummer, Betriebsdaten, 19 % USt oder
    Hinweis nach § 19 UStG, plus Prüfliste der Pflichtangaben nach § 14 UStG.

Zustand liegt in `localStorage`, Beispieldaten sind beim ersten Öffnen
geladen und in den Einstellungen zurücksetzbar.

## Warum die Trennung der beiden Dokumentsorten

Wer als Privatperson Umsatzsteuer auf ein Papier schreibt, schuldet sie dem
Finanzamt (§ 14c UStG). Darum hat die private Sorte das Feld gar nicht, statt
es nur leer zu lassen.

## Als nächstes

- Kundenbuchung: öffentliche Seite mit freien Slots. Die Tagesauslastung und
  die Öffnungszeiten im Prototyp sind schon die Grundlage dafür.
- Dauer-Schätzung aus echten Daten statt aus der Tabelle: jeder gestoppte
  Timer ist ein Datenpunkt. Genug Nutzer ergeben die Reparaturpreis- und
  Reparaturdauer-Datenbank, die es öffentlich nicht gibt.
- Teile aus dem Preisbuch heraus pflegen, Einkauf und Verkauf getrennt.
