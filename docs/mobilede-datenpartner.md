# Datenpartner-Antrag bei mobile.de

Stand: 13. November 2026. Grundlage: die Mail von Ron Oswald,
mobile.de Kundenservice. Code dazu: `lib/portalZugang.ts`
(`zugangWaehlen`), Probe: `scripts/mobilede-sandbox-probe.ts`.

## Was die Mail wirklich sagt

Drei Sätze entscheiden, und zwei davon sind besser als erwartet.

**Der Weg existiert und heißt Datenpartner.** „mobile.de bietet eine
Möglichkeit zur Bereitstellung eines REST-API basierten Datenpartner
Zugangs, anhand diesem sich aktive mobile.de Händlerkunden im Zuge
ausgewählter Funktionen (u.a. Bestandsverwaltung) administrieren
lassen." Das ist genau der Weg, den `zugangWaehlen` jetzt kann: eigene
Anmeldung, fremde Kundennummer.

**Er kostet nichts.** „Die Bereitstellung eines **kostenfreien**
Zugangs …" Damit ist die Sorge erledigt, dass die Portalanbindung eine
monatliche Grundlast wird wie bei der DAT.

**Und jetzt der Satz, der alles aufhält:** „… beschränkt sich hierbei
auf **gewerbliche Unternehmen** und ist an Voraussetzungen gebunden."

Dazu die Liste, die mitgeschickt werden muss:

| | verlangt | Stand |
|---|---|---|
| a | Ansprechpartner Vertrag | da |
| b | Ansprechpartner Technik | da |
| c | dedizierte Kontakt-E-Mail | **fehlt** (siehe unten) |
| d | Name der genutzten Software-Anwendung | da |
| e | **komplette Firmenanschrift** | **fehlt — braucht Gewerbe** |
| f | **Umsatzsteuernummer (VAT ID)** | **fehlt — braucht Finanzamt** |

Zwei von sechs Punkten kann niemand ausfüllen, der kein Gewerbe hat.

## Das ist der Flaschenhals, nicht die Ausstattung

Die Ausstattung war monatelang das Thema. Sie ist es nicht. **Alles
hängt an einer Gewerbeanmeldung und einer Umsatzsteuer-ID:**

- mobile.de Datenpartner: Punkt e und f
- AutoScout24: dieselbe Art Antrag
- DAT: Firmenname und Adresse sind Pflichtfelder im Formular
- Stripe: Auszahlungen brauchen ein Geschäftskonto
- Rechnungen an Händler: ohne Steuernummer nicht sauber stellbar

Die Reihenfolge ist damit erzwungen und hat nichts mit Programmieren
zu tun:

1. **Gewerbeanmeldung** beim Gewerbeamt. 20 bis 60 €, meist am selben
   Tag.
2. **Fragebogen zur steuerlichen Erfassung** über ELSTER, darin die
   USt-IdNr. beantragen. Das dauert — Wochen, nicht Tage. Deshalb
   sofort nach Schritt 1, nicht später.
3. Erst dann Punkt e und f beantwortbar, erst dann der Antrag.

Solange Schritt 1 und 2 nicht laufen, ist jede weitere Programmierzeile
Arbeit auf Halde. Das ist unangenehm, aber es ist die Lage.

## Punkt c: nicht die Gmail-Adresse

„Nennung einer dedizierten Kontakt E-Mail Adresse, über welche Sie uns
kontaktieren werden."

Ein Datenpartner-Antrag von einer Gmail-Adresse liest sich für eine
Vertragsabteilung wie ein Hobbyprojekt — und genau diese Abteilung
entscheidet, nicht Herr Oswald. Die Domain 2fast4sale.com ist vorhanden.
`datenpartner@2fast4sale.com` kostet nichts und ist in zehn Minuten
eingerichtet. Dieselbe Adresse dann auch gegenüber DAT und
AutoScout24 benutzen.

## Punkt d: der Satz, der am meisten entscheidet

„Den Namen der momentan von Ihnen genutzten Software-Anwendung."

Hier wird nicht nur ein Name erwartet, sondern aus „beschreiben Sie uns
bitte Ihre Anwendung oder Ihr Projekt so genau wie möglich" wird die
Eignung geprüft. Was in diesem Absatz steht, entscheidet über den
Zugang.

Drei Dinge gehören hinein, und eines davon fehlt bisher:

1. **Was die Anwendung tut** — Inserate für Händler erstellen:
   Fahrzeugschein auslesen, Fotos freistellen und in einen
   Studiohintergrund setzen, Titel und Beschreibung erzeugen,
   Ausstattung aus den Unterlagen übernehmen, dann über die Seller-API
   in den Bestand des Händlers stellen.
2. **Dass es keine Konkurrenz zum Portal ist** — es wird nichts
   weiterverkauft, keine Bestandsdaten gesammelt, keine eigene Börse
   gebaut. Jedes Inserat geht in das Konto des Händlers, der es
   beauftragt hat.
3. **Dass die Anbindung schon läuft.** Das ist das Einzige, was ein
   Einzelner einer Vertragsabteilung entgegensetzen kann: kein
   Vorhaben, sondern ein Protokoll gegen ihre eigene Sandbox.

Dafür gibt es jetzt `scripts/mobilede-sandbox-probe.ts`:

```bash
npx tsx scripts/mobilede-sandbox-probe.ts 1804 1995 2355 2597
```

Die Zugangsdaten setzt du vorher selbst als
`MOBILEDE_API_USERNAME` und `MOBILEDE_API_PASSWORD` — in den Quelltext
gehören sie nicht, und ich schreibe sie nirgendwo hin. Die Probe liest
nur: Sie fragt für jede Seller-ID den Bestand ab und sagt, ob der
Zugriff erlaubt war.

Laufen mehrere Verkäufer mit **einer** Anmeldung durch, ist belegt, was
der ganze Antrag behauptet. Die Ausgabe gehört als Anhang in die Mail.

## Zwei Dinge aus der Mail, die man leicht überliest

**Die Sandbox-Daten sind geteilt.** „Zudem werden diese Zugangsdaten
von diversen Entwicklern genutzt, so dass sich Datenbestände verändern
können." Heißt: Inseratszahlen und Testfahrzeuge dort sind nicht
verlässlich. Für eine Vorführung vor einem Händler ist die Sandbox
nicht geeignet, und ein Test, der auf bestimmten Fremddaten aufbaut,
kann morgen anders ausgehen. Was zählt, ist der Statuscode, nicht der
Inhalt.

**Der Zugang ist noch kein Vertrag.** „Die Erteilung eines Zugangs
führt hingegen nicht automatisch zu einem Vertragsangebot. Dieses
erfolgt erst durch Prüfung der von Ihnen bereitgestellten Informationen
durch unsere Vertragsabteilung." Die Sandbox-Zugangsdaten in der Hand
zu haben bedeutet also nichts für den Produktivbetrieb. Deshalb bleibt
`MOBILEDE_TRANSFER` auf `false`, bis der Produktivzugang schriftlich
erteilt ist.

## Entwurf, sobald Gewerbe und USt-IdNr. da sind

> Betreff: Datenpartner-Zugang Seller-API — 2Fast4Sale
>
> Sehr geehrter Herr Oswald,
>
> vielen Dank für die Sandbox-Zugangsdaten und die Übersicht. Die
> Anbindung an die Seller-API läuft inzwischen gegen Ihre
> Entwicklungsumgebung; ein Protokoll der Abfragen über mehrere
> Sandbox-Verkäufer liegt bei.
>
> Zu Ihrer Anwendungsbeschreibung:
>
> 2Fast4Sale erstellt für gewerbliche Kfz-Händler vollständige
> Inserate. Der Händler fotografiert Fahrzeugschein und Fahrzeug; die
> Anwendung liest die Fahrzeugdaten aus, stellt die Fotos frei und
> setzt sie in einen Studiohintergrund, erzeugt Titel und Beschreibung
> und übernimmt die Ausstattung aus den Unterlagen des Fahrzeugs.
> Anschließend wird das Inserat über die Seller-API in den Bestand des
> Händlers eingestellt und dort verwaltet.
>
> Zur Abgrenzung: Es werden keine Fahrzeug- oder Bestandsdaten
> weiterverkauft, es entsteht keine eigene Fahrzeugbörse und es werden
> keine Daten über den Auftrag des jeweiligen Händlers hinaus
> verarbeitet. Jedes Inserat wird ausschließlich im Konto des Händlers
> angelegt, der es in Auftrag gegeben hat. Abgerechnet wird je erstelltes
> Inserat gegenüber dem Händler, nicht über Datenweitergabe.
>
> Die angeforderten Angaben:
>
> a) Vertragliche Angelegenheiten: Fabian Barjamasi, [Telefon],
>    datenpartner@2fast4sale.com
> b) Technische Anfragen: Fabian Barjamasi, [Telefon],
>    datenpartner@2fast4sale.com
> c) Dedizierte Kontaktadresse: datenpartner@2fast4sale.com
> d) Software-Anwendung: 2Fast4Sale (Eigenentwicklung, 2fast4sale.com).
>    Eine Fremdsoftware ist nicht im Einsatz.
> e) Firmenanschrift: [vollständige Anschrift aus der Gewerbeanmeldung]
> f) Umsatzsteuer-ID: [USt-IdNr.]
>
> Für Rückfragen zur technischen Umsetzung stehe ich gerne zur
> Verfügung.
>
> Mit freundlichen Grüßen
> Fabian Barjamasi
> 2Fast4Sale · 2fast4sale.com

**Nicht abschicken, solange e und f leer sind.** Ein Antrag mit
Lücken landet in der Nachfrageschleife, und beim zweiten Mal liest die
Vertragsabteilung genauer.

## Was offen bleibt

- Ob der Datenpartner-Zugang einem Einzelunternehmen ohne
  Händlerkunden erteilt wird, steht nirgends. Die „Voraussetzungen"
  werden nicht genannt. Das ist ein echtes Risiko und kein
  Formfehler — es kann auch abgelehnt werden.
- AutoScout24 ist derselbe Weg und noch nicht angefragt. Die offizielle
  Doku liegt auf `autoscout24.github.io/api-documentation/`, der Zugang
  läuft über das Partner-/Händlerteam. Dieselben Angaben, dieselbe
  Sperre: ohne Gewerbe kein Antrag.
