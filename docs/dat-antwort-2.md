# Zweite Antwort an die DAT (Herr Weiermann)

Stand: 9. November 2026. Entwurf — vor dem Abschicken selbst durchlesen
und alles rauswerfen, was sich nicht wie du anhört.

Vorgängerentwurf: `docs/dat-antwort.md`. Kontakte und Alternativen:
`docs/datenbanken-kontakte.md`.

## Was in seiner Mail wirklich steht

Er hat alle drei Fragen beantwortet, und zwei der Antworten sind besser,
als sie klingen.

**Punkt 1 ist die eigentliche Nachricht.** „Es gibt bereits
Schnittstellenpartner, die per API-Datenpunkte für Ihre Anwendung
beziehen. Die Konditionen werden dabei individuell, je nach Volumen,
Umfang usw. angeboten." Das heißt: Es gibt Firmen, die den Workshop und
die Partnerschaft schon bezahlt haben und die Daten weiterverkaufen. Da
fällt für dich weder die Bronze-Partnerschaft noch der Workshop an.
**Er hat dir keine Namen genannt, und du hast nicht nachgefragt.** Das
ist die eine offene Sache in dieser Mail.

**Punkt 2 beantwortet deine Frage mit Ja — mit einem Haken.** Läuft die
Abfrage über die Lizenz des Händlers, darfst du dein System anbieten.
Der Haken ist sein Nachsatz: „Allerdings ist in der SilverDAT 3 bereits
eine Schnittstelle zu allen Fahrzeugbörsen vorhanden." Das ist höflich
formuliert, aber eindeutig: Ein Händler mit SilverDAT 3 PRO stellt seine
Inserate schon heute auf alle Börsen. Für den bist du nicht die Lösung,
sondern eine zweite Rechnung.

Das ist kein Schlag, das ist eine Auskunft über deinen Markt. Dein Kunde
ist der Händler mit 10 bis 30 Autos, der **keine** DAT-Lizenz hat, nicht
bewertet, nicht kalkuliert und mit dem Handy fotografiert. Und genau der
hat auch keinen FIN-Zugang — für den ist das Auslesen der Fahrzeugmappe
kein Notbehelf, sondern der einzige Weg, der überhaupt existiert.

Ob das so stimmt, weißt du nicht aus dieser Mail. Das musst du bei den
nächsten Händlern, mit denen du redest, als Erstes fragen: „Haben Sie
SilverDAT oder Schwacke?" Zwei Minuten, und du weißt, ob du am
richtigen Kunden baust.

**Punkt 3 ist der Preis der Vordertür.** 154 € Lizenz + 200 €
Bronze-Partnerschaft = 354 € im Monat, dazu 950 € einmalig für den
Workshop, dazu 1,85 € je Abruf.

Gerechnet gegen das, was wirklich hängenbleibt — 4,75 € Rohertrag je
Inserat bei 7,50 € Preis (`lib/preismodell.ts`):

| | Betrag | entspricht |
|---|---|---|
| Erster Monat | 1.304 € | **275 Inserate** |
| Jeder weitere Monat | 354 € | **75 Inserate** |
| Je FIN-Abruf | 1,85 € netto ≈ 2,20 € brutto | 46 % des Rohertrags |

275 Inserate im ersten Monat, bevor du einen Cent verdienst. Du hast
null. Das ist kein Verhandeln, das ist eine Größenordnung, die nicht
passt — und sie passt auch bei 20 % Rabatt nicht.

Der Abruf selbst ist dagegen harmlos, solange er als Aufpreis an den
Händler durchgeht, der ihn auslöst. Niemals einschließen: 2,20 € von
4,75 € wäre fast die Hälfte deines Rohertrags für ein Feld, das der
Händler in neun von zehn Fällen auf seinem eigenen Zettel stehen hat.

## Was du also antwortest

Du sagst Nein zu Punkt 3, Ja zu Punkt 1 und bedankst dich für Punkt 2.
Nichts beschönigen, nichts hinhalten. Ein klares Nein mit einer klaren
Anschlussfrage ist für ihn weniger Arbeit als ein höfliches
Vielleicht — und du bleibst ein Gesprächspartner, zu dem er in einem
Jahr zurückkommen kann.

### Entwurf

> Betreff: Re: Schnittstellenpartnerschaft — 2Fast4Sale
>
> Sehr geehrter Herr Weiermann,
>
> danke für die klaren Antworten, besonders zu Punkt 2 — damit weiß ich,
> woran ich bin.
>
> Zu Punkt 3 muss ich ehrlich Nein sagen. 354 € im Monat plus 950 € für
> den Workshop sind gerechnet auf meinen Rohertrag rund 275 Inserate im
> ersten Monat und danach 75 Inserate monatlich, die ausschließlich die
> Anbindung bezahlen. Ich habe noch keinen zahlenden Händler. Dieser
> Start wäre nicht ehrlich kalkuliert, sondern geraten, und das würde
> uns beiden nichts bringen.
>
> Interessant ist für mich Ihr Punkt 1. Könnten Sie mir sagen, welche
> Ihrer Schnittstellenpartner FIN-Datenpunkte an Dritte weitergeben?
> Ein Preis je Abruf ohne monatliche Grundlast passt zu meinem Modell —
> ich rechne je Inserat ab und würde den Abruf als Aufpreis an den
> Händler weitergeben, der ihn auslöst. Über eine Nennung von zwei oder
> drei Partnern wäre ich sehr dankbar; den Kontakt stelle ich dann
> selbst her.
>
> Zu Ihrem Hinweis, dass SilverDAT 3 bereits auf alle Fahrzeugbörsen
> veröffentlicht: Das nehme ich ernst, und es überschneidet sich
> tatsächlich. Nur richte ich mich nicht an diese Händler. Mein Kunde
> ist der kleine Händler mit 10 bis 30 Fahrzeugen, der keine
> SilverDAT-Lizenz hat, nicht bewertet und nicht kalkuliert, und der
> seine Fotos mit dem Handy macht. Für den löse ich das Fotografieren
> und das Schreiben des Inserats, nicht das Bewerten. Wer SilverDAT 3
> PRO einsetzt, braucht mich nicht — da sind wir uns einig.
>
> Falls es den Weg über einen Partner nicht gibt, ist das für mich kein
> Nein für immer. Dann melde ich mich wieder, sobald ich bei rund 80
> Inseraten im Monat liege; dann trägt sich die Bronze-Partnerschaft von
> selbst.
>
> Eine letzte Frage zum Workshop, für später: Auf Ihrer Anmeldeseite ist
> nur der erste Tag, die Fahrzeug-Identifikation, als Pflichtteil
> ausgewiesen, zu 299 € netto. Bewerten, Kalkulieren und
> Schadenmanagement brauche ich nicht. Würde für die Partnerschaft
> dieser eine Tag genügen?
>
> Mit freundlichen Grüßen
> Fabian Barjamasi
> 2Fast4Sale · 2fast4sale@gmail.com · 2fast4sale.com

## Was du NICHT schreibst

- **Nicht um die 354 € feilschen.** Ein Rabatt auf eine Zahl, die um das
  Zehnfache zu hoch ist, hilft nicht. Die Partnernennung aus Punkt 1 ist
  das Einzige, was dir diese Mail bringen kann.
- **Keine Nutzerzahlen, keine Umsätze, kein „wir".** Du bist einer. Beim
  ersten Rückruf fällt jede erfundene Zahl auf.
- **Den 16.11. lässt du laufen.** Der Workshop ist das Letzte, was man
  kauft, nicht das Erste — und 950 € für etwas, das du ohne die
  Partnerschaft nicht einsetzen kannst, sind 950 € zu früh. Die
  nächsten Termine sind 18.01.2027 (englisch) und 15.03.2027.

## Danach

1. Dieselbe Frage an Schwacke: `customer@jdpower.com`, Autovista API /
   VIN API, Preis je Abruf ohne monatliche Grundlast. Ein Angebot ist
   kein Preis, zwei sind einer.
2. Bei den nächsten Händlergesprächen zuerst fragen: „Haben Sie
   SilverDAT oder Schwacke?" Die Antwort entscheidet, ob die FIN-Daten
   für dich überhaupt ein Thema sind.
3. Bis dahin bleibt die Fahrzeugmappe die Quelle, und sie funktioniert —
   Test 1 ist bestanden.
