# Wer liefert Ausstattung ab Werk — und bei wem man sich meldet

Stand: 8. November 2026. Alles hier stammt von den Seiten der Anbieter
selbst, am 8.11.2026 gelesen. Nichts geschätzt. Was nicht dastand,
steht hier als "nicht genannt".

Belegt ist auch das Gegenstück: `scripts/vin-datenbank-probe.ts` zeigt,
dass die einzige offene FIN-Datenbank (vPIC der US-Behörde NHTSA) für
deutsche Fahrzeuge **null** Ausstattungsfelder liefert. Es gibt keinen
kostenlosen Weg. Es gibt nur diese drei Häuser.

---

## 1. DAT — Deutsche Automobil Treuhand, Ostfildern

Das ist der Anbieter, mit dem schon gesprochen wurde (Herr Weiermann).
Die Antwort dazu liegt in `docs/dat-antwort.md` und ist **nie
abgeschickt worden**. Das ist der eigentliche Stillstand, nicht die
Technik.

```
Deutsche Automobil Treuhand GmbH
Hellmuth-Hirth-Straße 1
73760 Ostfildern
Tel: +49 711 4503-130
```

- Anfrageformular für Softwareanbieter:
  <https://www.dat.de/schnittstellenpartnerschaft/>
- Marktabdeckung der FIN-Abfrage: 99,8 % laut DAT. Das ist das "alle
  Marken", nach dem gefragt war.
- Geliefert werden laut DAT: Hersteller, Baureihe, Karosserieform,
  Motorisierung und **die exakte Ausstattung ab Werk**.
- Bei einzelnen Herstellern greift ein Ersatzverfahren ("VIN Basic")
  aus DAT-eigenen Daten statt echter Herstellerdaten. Welche Hersteller
  das sind, steht nicht öffentlich — das ist eine Frage für das
  Telefonat, weil Ersatzdaten für ein Inserat etwas anderes sind als
  Werksdaten.

### Das Formular fragt nach

Pflichtfelder, die vorher da sein müssen: **Firmenname, Adresse, PLZ,
Ort**, Anrede, Vorname, Nachname, E-Mail, Telefon. Dazu Art der
Anwendung, Produktname, Nutzer des Produkts, Funktionsbeschreibung.
Die DAT-Kundennummer ist freiwillig.

Heißt: Ohne angemeldetes Gewerbe kann man das Formular nicht ehrlich
ausfüllen. Als Branche passt, was die DAT selbst nennt —
"Internetplattformen für den Handel mit Gebrauchtfahrzeugen" steht
wörtlich in der Zielgruppe der Seite.

### Schnittstellen-Workshop — mit Frist

<https://www.dat.de/schnittstellenpartnerschaft/workshop/>

| Modul | Termin | Rolle |
|---|---|---|
| **Fahrzeug-Identifikation (FIN, HSN/TSN, Natcode)** | **16.11.2026** | **Pflichtteil** |
| Bewerten mit SilverDAT 3 | 17.11.2026 | Wahlpflichtteil |
| myClaim Schadenmanagement | 18.11.2026 | Wahlpflichtteil |
| High-Mobility Telematik | 18.11.2026 | Wahlpflichtteil |
| Kalkulieren mit SilverDAT 3 | 19.11.2026 | Wahlpflichtteil |

Jedes Modul 08:30–12:30 Uhr. **"Sofern keine individuellen Preise
vereinbart wurden, gilt der Preis pro Tag von 299,00 € (zzgl. USt.) pro
Person."** Und: **"Die Anmeldung ist bis eine Woche vor dem Workshop
möglich."**

Zwei Dinge fallen daran auf:

1. Nur Tag 1 ist Pflicht, und Tag 1 ist genau die
   Fahrzeug-Identifikation — das Thema, um das es hier geht. Bewerten,
   Kalkulieren und Schadenmanagement braucht 2Fast4Sale nicht. **299 €
   netto, nicht 950 €.** Die 950 € am Telefon waren offenbar mehrere
   Tage oder ein anderes Paket. Das ist nachfragbar.
2. Eine Woche vor dem 16.11. ist der **9.11.2026** — morgen. Danach ist
   der nächste Pflichtteil am **18.01.2027**, und der läuft auf
   Englisch. Der deutsche danach: 15.03.2027.

Der Workshop ist laut Seite "für Entwickler und Product-Owner mit
Programmier-Kenntnissen" und verlangt SoapUI — die Schnittstelle ist
also SOAP, nicht REST.

### Aber nicht blind anmelden

299 € sind weg, wenn die Antwort auf die eine offene Frage "nein"
lautet. Die Frage steht in `docs/dat-antwort.md` und ist nach wie vor
unbeantwortet:

> Geht die Abrechnung **je Abruf**, und darf die Abfrage **im Auftrag
> des Händlers** laufen?

Lautet die Antwort "nur über eine monatliche Partnerschaft", wäre der
Workshop Geld für etwas, das danach ohnehin nicht tragbar ist. Die Frage
kostet nichts, der Workshop 299 €. Also erst die Frage. Telefon, heute
oder morgen früh — eine Mail schafft die Frist nicht.

---

## 2. Schwacke — JD Power, Frankfurt

Zweites Haus, dieselbe Art von Daten, eigener Vertrag. Schwacke gehört
heute zu JD Power, zusammen mit Eurotax, Glass's und Autovista. Ein
Ansprechpartner deckt damit Deutschland und große Teile Europas ab.

```
Schwacke GmbH
Westendstraße 28
60325 Frankfurt
Tel.: +49 69 808839 50
E-Mail: customer@jdpower.com
Geschäftsführung: Thorsten Barg, Dr. Christof Engelskirchen
HRB 114451 (Amtsgericht Frankfurt)
```

- Schwacke schreibt selbst, die FIN-Abfrage erfasse **alle ab Werk
  verbauten Ausstattungen**.
- Das Entwicklerprodukt heißt **Autovista API / VIN API** und ist für
  17 Länder gelistet, Deutschland dabei.
- Preise, Vertragsbedingungen und Entwicklerzugang stehen nirgends
  öffentlich. Nur über den Vertrieb.

Warum überhaupt ein zweites Haus: Ein einziges Angebot ist kein Preis,
sondern eine Ansage. Zwei Angebote sind ein Preis. Und sollte die DAT
beim monatlichen Modell bleiben, ist das hier die Alternative statt des
Endes.

---

## 3. Audatex / Solera

Dritte Möglichkeit, hier nur zur Vollständigkeit. Produkt heißt
**Qapter VIN**, laut Audatex als Webdienst verfügbar. Audatex und
Eurotax-Schwacke haben ihre Fahrzeugidentifikation abgestimmt, das
Haus ist also eng mit Nummer 2 verbunden — als echte Alternative zu
Schwacke taugt es deshalb weniger.

```
Audatex Deutschland GmbH
Kuhlenstraße 15
32427 Minden
```

Eine ältere Branchenangabe nennt für FIN-Abfragen quer über die
Anbieter **1 € bis 3 € je Abruf**, abhängig von Hersteller und System.
Alt, aber eine Größenordnung: Bei 3,50 € je Inserat ist ein Abruf für
2 € kein Nebenbei, sondern muss als Aufpreis an den Händler durch.

---

## Reihenfolge

1. **Heute telefonieren: +49 711 4503-130.** Die beiden Fragen aus
   `docs/dat-antwort.md` stellen und nach dem Preis für **nur Modul 1**
   fragen. Kostet nichts und entscheidet alles.
2. **Gewerbe anmelden.** Ohne Firmenname und Adresse geht kein Formular
   bei keinem der drei Häuser. Seit dem 5.10.2026 steht dem nichts mehr
   im Weg.
3. **Schwacke anschreiben: customer@jdpower.com**, Autovista API /
   VIN API, Preis je Abruf. Ein zweites Angebot einholen, bevor man
   dem ersten zustimmt.
4. **Bis dahin bleibt die Fahrzeugmappe die Quelle.** Schritt 1 liest
   Bestellbestätigung und Übergabeprotokoll, PDF und Foto, mehrere
   Seiten. Das ist kein Notbehelf: Das Dokument gehört zum konkreten
   Fahrzeug, eine Datenbank kennt nur das Modell.

## Was hier korrigiert wird

Früher stand in diesem Projekt die Einschätzung, die DAT verkaufe keine
Schnittstelle an Softwareanbieter. Das war falsch. Die DAT hat ein
eigenes Programm dafür, nennt Internetplattformen für den
Gebrauchtwagenhandel ausdrücklich als Zielgruppe und bietet dazu einen
regelmäßigen Workshop an. Die Tür ist offen — sie kostet Geld, und die
Frage nach dem Abrechnungsmodell ist offen. Das ist etwas anderes als
verschlossen.
