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
- **Dokument** — drei getrennte Sorten:
  - *Kostenvoranschlag* fuer Arbeit, die noch nicht gemacht ist: eigene
    Nummer, Gueltigkeitsdatum, Summe als "Voraussichtlich", und im Text
    ausdruecklich "Es wurde noch keine Arbeit ausgefuehrt" samt der ueblichen
    Klausel zu Abweichungen bis 15 %. Keine Zahlungszeile.
    Der Knopf *Angenommen* legt den Termin auf den naechsten freien Platz
    (Werktag, nach dem letzten Termin des Tages, passend zur geschaetzten
    Dauer), haengt ihn an den Auftrag und merkt sich die Summe. Danach zeigt
    der Auftrag die Abweichung gegenueber dem Voranschlag in Prozent und warnt
    ab 15 %. Rechnung und Kostenaufstellung nennen den Voranschlag als
    Grundlage, im PDF als eigene Zeile.

  - *Kostenaufstellung* für privat: ohne Steuernummer, ohne
    Umsatzsteuerausweis, mit Vermerk zur privaten Hilfeleistung.
  - *Rechnung* für gewerblich: Rechnungsnummer, Betriebsdaten, 19 % USt oder
    Hinweis nach § 19 UStG, plus Prüfliste der Pflichtangaben nach § 14 UStG.

  Beide gibt es als **PDF** (jsPDF, A4, Anschriftenfeld nach DIN 5008):
  Absenderblock, Empfänger mit Anschrift, Eckdaten mit Fahrzeug und
  Kilometerstand, Positionen nach Arbeit und Teilen, Summenblock, Zahlungsziel
  und IBAN, Fußzeile mit Steuernummer auf jeder Seite, Seitenumbruch mit
  wiederholtem Tabellenkopf. Die Rechnungsnummer wird **einmal** beim ersten
  Erzeugen vergeben, am Auftrag gespeichert und ändert sich danach nicht mehr;
  der Zähler in den Einstellungen rückt dabei weiter. Ohne vollständige
  Pflichtangaben verweigert der Knopf die Rechnung und nennt, was fehlt.

Zustand liegt in `localStorage`, Beispieldaten sind beim ersten Öffnen
geladen und in den Einstellungen zurücksetzbar.

## Warum die Trennung der beiden Dokumentsorten

Wer als Privatperson Umsatzsteuer auf ein Papier schreibt, schuldet sie dem
Finanzamt (§ 14c UStG). Darum hat die private Sorte das Feld gar nicht, statt
es nur leer zu lassen.

## Haftung

Die private Kostenaufstellung kann einen Haftungshinweis tragen (in den
Einstellungen abschaltbar): Gefaelligkeit ohne Gewinnerzielungsabsicht, keine
Gewaehrleistung, Haftung fuer Sachschaeden auf Vorsatz und grobe
Fahrlaessigkeit beschraenkt, Koerperschaeden ausgenommen. Das wirkt nur, wenn
die Arbeit wirklich privat und ohne Gewinn erfolgt; ein Betrieb kann die
Gewaehrleistung gegenueber Privatkunden nicht ausschliessen.

Nicht gebaut und nicht vorgesehen: ein Papier, das nach erledigter Arbeit
aussieht, obwohl nichts gemacht wurde. Das taeuscht den Leser, und es
schuetzt auch nicht -- Haftung entsteht aus der Arbeit, nicht aus dem
Dokument. Wer nichts gemacht hat, schreibt einen Kostenvoranschlag.

## Zahlung

Je Auftrag eine Zahlungsart (Bar, Überweisung, EC-Karte) und ein Status.
"Bezahlt erhalten" setzt Status und Datum. Daraus folgt, was auf dem Papier
steht: bei bezahlter Barzahlung "Betrag dankend bar erhalten am TT.MM.JJJJ.
Diese Rechnung gilt zugleich als Quittung", sonst der passende Zahlungshinweis
-- Zahlungsziel und IBAN erscheinen nur bei Überweisung. Der Verlauf zeigt
offene Betraege als eigene Kennzahl und markiert unbezahlte Auftraege.

Barzahlung ist dabei ein normaler Zahlungsweg mit Beleg, kein Weg daran
vorbei. Funktionen, die Umsaetze verschwinden lassen, gibt es hier nicht und
sollen auch nicht dazukommen: ein Betrieb koennte die Software sonst nicht
einsetzen.

## Offen vor echtem Einsatz

Sobald ein Betrieb damit wirklich abrechnet, gelten die GoBD: fortlaufende
Nummern ohne Lücken, keine nachträgliche Änderung oder Löschung erstellter
Rechnungen, zehn Jahre Aufbewahrung, Export für die Betriebsprüfung. Der
Prototyp vergibt die Nummer zwar schon fest, erfüllt den Rest aber nicht --
das gehört gebaut, bevor dafür Geld genommen wird. Für Kleinunternehmer nach
§ 19 ist die Hürde niedriger.

## Als nächstes

- Kundenbuchung: öffentliche Seite mit freien Slots. Die Tagesauslastung und
  die Öffnungszeiten im Prototyp sind schon die Grundlage dafür.
- Dauer-Schätzung aus echten Daten statt aus der Tabelle: jeder gestoppte
  Timer ist ein Datenpunkt. Genug Nutzer ergeben die Reparaturpreis- und
  Reparaturdauer-Datenbank, die es öffentlich nicht gibt.
- Teile aus dem Preisbuch heraus pflegen, Einkauf und Verkauf getrennt.
