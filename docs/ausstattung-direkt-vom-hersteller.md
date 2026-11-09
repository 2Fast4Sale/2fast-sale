# Ausstattung direkt vom Hersteller — ohne Drittanbieter

Stand: 9. November 2026. Vorgeschichte: `docs/mrvin-herkunft.md`
(warum billige Drittanbieter ausfallen), `docs/datenbanken-kontakte.md`
(die Lizenzhäuser), `docs/kapital-und-ausstattung.md` (das Geld).

**Kurzfassung: Ja, es geht, und die EU garantiert es dir sogar.** Aber
nicht als Schnittstelle — das hat der EuGH ausdrücklich entschieden.
Direkt heißt: ein Portal je Marke, Stundenlizenz, von Hand.

---

## Das Recht, das du hast

Verordnung (EU) 2018/858, Artikel 61: Hersteller müssen unabhängigen
Wirtschaftsakteuren Zugang zu Reparatur- und Wartungsinformationen
(RMI) geben — „uneingeschränkt, standardisiert und
diskriminierungsfrei", gegen angemessenes Entgelt. Dazu gehört die
Fahrzeugbestimmung über die FIN.

Das klingt nach genau dem, was du suchst. Entscheidend ist aber ein
Urteil, das die Grenze zieht.

### EuGH C-319/22 vom 9. November 2023

Der Gesamtverband Autoteile-Handel hatte Scania verklagt, weil Scania
die Daten nur über eine Website zum Ausdrucken oder als PDF anbot.
Verlangt wurde eine Datenbankschnittstelle mit maschinellen Abfragen.
Der Tenor, wörtlich:

> „Die Fahrzeughersteller sind **nicht** verpflichtet, Fahrzeugreparatur-
> und Wartungsinformationen über eine Datenbankschnittstelle zugänglich
> zu machen, die eine maschinengesteuerte Abfrage und den Download der
> Ergebnisse ermöglicht."

Das ist die Antwort auf deine Frage, und sie ist ein Nein zu dem, was du
eigentlich willst: **Es gibt keine Hersteller-API, und es gibt kein
Recht darauf.** Genau deshalb existieren DAT, Audatex und Schwacke
überhaupt — sie haben verhandelte Lizenzen, keine gesetzlichen.

Der zweite Halbsatz des Tenors ist aber nicht nichts:

> „Sie sind jedoch verpflichtet, diese Informationen unabhängigen
> Wirtschaftsakteuren **in Dateien bereitzustellen, deren Format der
> unmittelbaren elektronischen Weiterverarbeitung** der in diesen
> Dateien enthaltenen Datensätze dient."

Scanias „Ausdrucken oder als PDF speichern" genügte dem Gericht
ausdrücklich nicht, weil es nur zur *mittelbaren* Weiterverarbeitung
taugt (Rn. 40). Du hast also ein Recht auf Dateien, die eine Software
auslesen kann — nur nicht darauf, sie automatisch abzufragen.

Dazu, ebenfalls aus dem Urteil: Artikel 61 begründet eine „rechtliche
Verpflichtung" im Sinne von Art. 6 Abs. 1 Buchst. c DSGVO, die **FIN**
unabhängigen Akteuren bereitzustellen. Datenschutz ist hier also kein
Hinderungsgrund.

### Die offene Frage, die ein Anwalt klären muss

RMI heißt Reparatur- **und Wartungs**informationen. Der Zugang wird für
Instandhaltung, Diagnose und Reparatur gewährt. Du willst die Daten für
ein **Verkaufsinserat** — ein anderer Zweck.

Ob du als Anbieter von Inseratssoftware „unabhängiger
Wirtschaftsakteur" im Sinne der Verordnung bist und ob die
Nutzungsbedingungen der Portale diesen Zweck zulassen, habe ich nicht
geprüft und kann ich nicht beurteilen. **Das ist die eine Frage, die du
klären lassen musst, bevor du darauf etwas baust** — nicht erst, wenn
der erste Händler haftet. Sie gehört auf die Liste zum Anwalt, zusammen
mit AGB und Datenschutzerklärung.

---

## Die Portale, konkret

Jede Marke ein eigenes Portal, eine eigene Registrierung, eine eigene
Zahlung.

### VW, Audi, Škoda, Seat — erWin

Das ist das zugänglichste. Nach den gefundenen Angaben: Registrierung
kostenlos und einmalig, abgerechnet wird die Nutzungszeit, eine
Stundenlizenz liegt bei rund **8,60 € brutto**. Über die FIN sind die
Reparaturleitfäden und die originale Ausstattungsliste mit den
Werkscodes (PR-Nummern) abrufbar.

Eine Quelle berichtet, erWin zeige fahrzeugspezifische Daten per FIN
nicht mehr an. Das widerspricht den anderen Angaben und ist nicht
geklärt — die verbindlichen Konditionen stehen im Portal selbst, und
das Konto ist kostenlos. **Eine Registrierung kostet dich nichts und
beantwortet das in zwanzig Minuten.** Das ist der erste Schritt.

### Mercedes-Benz — B2B Connect

Zwei Modelle, beide für unabhängige Marktteilnehmer, Registrierung als
ISP nötig:

- **XENTRY Kombipaket:** Pakete mit 1, 5 oder 10 Credits. Ein Credit
  gibt 24 Stunden Zugang **für eine FIN**. Passt zum Abrechnen je
  Fahrzeug.
- **RMI-Zeitscheiben:** 1 Stunde, 1 Tag, 1 Woche, 1 Monat, 1 Jahr —
  FIN-unabhängig. Passt, wenn mehrere Fahrzeuge in einer Stunde
  durchlaufen.

Preise nennt Mercedes nicht öffentlich.

### BMW und die übrigen

Dasselbe Prinzip, eigene Portale (BMW AOS/ISTA), die konkreten
Konditionen habe ich nicht gefunden. Jede weitere Marke bedeutet
dieselbe Arbeit noch einmal.

---

## Warum das trotzdem nicht die Lösung ist

Rechne es gegen die DAT:

| | Kosten je Fahrzeug | Aufwand je Fahrzeug |
|---|---|---|
| erWin, 1 Stunde, 10 Fahrzeuge | **0,86 €** | manuell, FIN eingeben, Liste holen |
| erWin, 1 Stunde, 1 Fahrzeug | 8,60 € | dasselbe |
| DAT | 1,85 € netto | ein Aufruf aus der Software |

Beim Preis gewinnt der direkte Weg, sobald du mehrere Fahrzeuge in einer
Stunde schaffst. Er verliert an zwei anderen Stellen, und die sind
schwerer:

1. **Ein Portal je Marke.** Ein Gebrauchtwagenhändler hat VW, BMW,
   Mercedes, Opel, Ford, Renault, Škoda, Kia auf dem Platz. Das sind
   acht Registrierungen, acht Abrechnungen, acht Oberflächen — für dich
   allein, neben der Ausbildung. Die DAT verkauft genau diese
   Bündelung, nicht die Daten.
2. **Es bleibt Handarbeit.** Ohne Schnittstelle gibt es keine
   Automatik, und der EuGH hat gesagt, dass du keine verlangen kannst.
   Dein Produkt verkauft aber, dass der Händler nichts tun muss. Ein
   Weg, bei dem *du* je Fahrzeug in ein Herstellerportal gehst,
   skaliert nicht über die ersten Kunden hinaus.

---

## Der Weg, der wirklich ohne Drittanbieter geht

**Der Fahrzeugdatenträger liegt im Auto.** Meist im Serviceheft oder in
der Reserveradmulde, bei VAG mit allen PR-Nummern. Das ist
Herstellerdaten aus erster Hand, kostet nichts und gehört dem Händler
schon.

Der Haken: Dort stehen **Codes, keine Bezeichnungen**. „4A3" ist eine
Sitzheizung, aber das steht nicht daneben. Und eine Zuordnungstabelle,
die ich aus dem Gedächtnis fülle, ist genau das, was hier nicht
passieren darf — ein falsch benannter Code ist eine falsche Zusicherung
im Inserat. Die Tabelle ist die eigentliche Arbeit, und sie ist der
Grund, warum andere dafür Geld nehmen.

**Darum ist der Weg, der heute schon läuft, der richtige:** die
Bestellbestätigung, das Übergabeprotokoll, der Ausdruck aus dem System
des Händlers. Dort stehen die Merkmale in Klartext, auf Deutsch, zu
genau diesem Fahrzeug, vom Hersteller oder Verkäufer selbst
geschrieben. Kein Code zum Übersetzen, kein Drittanbieter, keine
Lizenzfrage. Rund 2 Cent je Inserat, und Test 1 ist bestanden.

Und für den Fall, dass der Händler Vertragshändler ist: **Der kann die
Datenkarte selbst in zwei Minuten ausdrucken**, aus seinem eigenen
Herstellerzugang, mit Bezeichnungen. Das ist dieselbe Quelle wie erWin —
nur dass sie ihn nichts kostet, weil er den Zugang schon hat. Danach
fragen kostet einen Satz im Gespräch.

---

## Reihenfolge

1. **erWin-Konto anlegen.** Kostenlos. Eine FIN eingeben und
   nachsehen, was tatsächlich kommt — Liste, Codes, oder nichts. Zwanzig
   Minuten, und die widersprüchlichen Angaben sind geklärt.
2. **Beim Anwalt mit auf die Liste:** Darf ein Anbieter von
   Inseratssoftware RMI-Daten für ein Verkaufsinserat nutzen? Zusammen
   mit AGB und Datenschutz, nicht als eigener Termin.
3. **Händler fragen, ob sie die Datenkarte ausdrucken können.** Kostet
   nichts und liefert mehr als jedes Portal.
4. **Weiter mitzählen**, wie oft die Unterlagen nichts hergeben
   (`meta.merkmale` in der Kostentabelle, seit heute drin). Diese Zahl
   entscheidet, ob sich der ganze Aufwand lohnt.

Was du **nicht** tun solltest: acht Herstellerportale aufbauen, bevor
ein Händler bezahlt. Das ist dieselbe Falle wie die 354 € im Monat, nur
mit Arbeitszeit statt Geld — und deine Arbeitszeit ist knapper als dein
Geld.
