# 5.000 € und die Ausstattung — wofür das Geld reicht und wofür nicht

Stand: 9. November 2026. Vorgeschichte: `docs/dat-antwort-2.md`,
`docs/datenbanken-kontakte.md`, Beleg: `scripts/vin-datenbank-probe.ts`.

## Die Frage war: wo bekomme ich die Ausstattungen

Von sechs geprüften Anbietern passt **genau einer** zu einem Modell, das
je Inserat abrechnet. Alle anderen fallen entweder am Preis oder an den
Daten durch.

| Anbieter | Ausstattung je FIN? | Modell | Urteil |
|---|---|---|---|
| **MrVIN** | ja, Feld `equipment`, ausdrücklich für europäische FIN | Prepaid, **kein Abo, keine Mindestabnahme** | **anfragen** |
| DAT | ja, 99,8 % Abdeckung, Originaldaten | 354 €/Monat + 950 € + 1,85 €/Abruf | zu teuer, Nein ist raus |
| Schwacke / JD Power | ja, „alle ab Werk verbauten Ausstattungen" | nicht öffentlich, Vertrieb | anfragen, Gegenangebot |
| Audatex / Solera | ja, Qapter VIN | nicht öffentlich | hängt mit Schwacke zusammen |
| Vincario (vindecoder.eu) | **nein** — kein Ausstattungsfeld im Decode | Abo, min. 1 Monat | raus |
| CarsXE | nur Serienausstattung des Modells (Beispiel: zwei Posten, „ABS Std.", „Klima Std.") | 69 $/Monat Abo | raus |
| vPIC (NHTSA, kostenlos) | **nein**, null Felder — gemessen | kostenlos | raus |

### MrVIN im Einzelnen

Aus der eigenen Dokumentation, wörtlich:

> „The factory option list recorded against the VIN at build, with a
> category and a standard or optional tier per item, **where available
> for the make**."

Jeder Posten hat `code`, `description`, `category` (SAFETY, LIGHTS,
INTERIOR, MEDIA, DRIVETRAIN, EXTERIOR, PACKAGES, OTHER, FACTORY), `tier`,
`label`, `featureKey`. Also genau die Unterscheidung Serie/Sonder, die
ein Inserat braucht.

Zum Geschäftsmodell, ebenfalls wörtlich: „Accounts are set up by hand
and priced per account … **There is no subscription and no minimum**."
Guthaben steht im Antwortkopf (`X-Credit-Balance`), leeres Guthaben gibt
402 statt einer Rechnung, fehlgeschlagene Abrufe werden nicht berechnet,
dieselbe FIN zweimal kostet einmal.

**Zwei Dinge sind ungeklärt, und beide sind wichtig:**

1. **Der Preis steht nirgends.** Er wird je Konto festgelegt und ist
   erst nach Zugang über `/v1/account` sichtbar.
2. **„where available for the make"** ist ein großer Vorbehalt. Für
   welche Marken es Daten gibt, steht nicht da. Die Doku zeigt kein
   einziges Beispiel mit gefüllter `equipment`-Liste — das gezeigte
   Beispiel enthält nur Marke, Modell, Baujahr eines VW Golf.

Daraus folgt die Reihenfolge: **anfragen, dann testen, dann erst
bezahlen.** Nicht umgekehrt. Fünf echte Fahrzeuge aus einem
Händlerbestand, Ergebnis gegen die Papiere gelegt — wenn die Liste leer
ist oder nur „ABS Serie" sagt, ist es dasselbe wie CarsXE und damit
nichts wert.

## Jetzt zum Geld

Du willst 5.000 € einsetzen und ins Minus gehen. Das ist dein Geld und
deine Entscheidung, und niemand muss dir das ausreden. Was man dir aber
sagen muss, bevor du es tust:

**Das Geld kauft keine Ausstattung, es kauft Zeit.** 5.000 € sind nicht
„Kapital für eine Datenbank", sie sind dein Puffer, solange nichts
reinkommt. Jeden Monatsbeitrag, den du unterschreibst, tauschst du gegen
ein Stück dieses Puffers — und zwar unwiderruflich, weil ein Abo
weiterläuft, auch wenn kein Händler bestellt.

Was die DAT-Vordertür mit den 5.000 € machen würde:

| | |
|---|---|
| Workshop einmalig | 950 € |
| 354 €/Monat | **11,4 Monate**, dann ist alles weg |
| Übrig für Gewerbe, AGB, Steuerberater, Portalverträge | 0 € |

Nach elf Monaten hättest du perfekte Ausstattungsdaten, kein Geld und —
wenn sich nichts ändert — immer noch keinen zahlenden Händler. Denn die
Ausstattung ist nicht das, was dir fehlt.

**Was dir fehlt, ist der erste Händler, der bezahlt.** Dafür brauchst du
keine FIN-Datenbank. Du hast seit gestern eine Ausstattungsquelle, die
funktioniert: die Fahrzeugmappe wird gelesen, PDF und Foto, mehrere
Seiten, Test 1 bestanden, rund 2 Cent je Inserat statt 2,20 €.

### Die eine Zahl, die du nicht kennst

Wie oft hat ein Händler zu einem Fahrzeug **keine** Unterlagen? Das ist
die einzige Lücke zwischen deinem heutigen Stand und der DAT. Niemand
hier kennt diese Zahl — auch ich nicht.

- Ist es 1 von 20, zahlst du 354 € im Monat für ein Inserat.
- Ist es 10 von 20, ist das ein anderes Gespräch.

Diese Zahl kostet nichts und ist in zwei Wochen da: Bei den nächsten
zwanzig echten Fahrzeugen mitzählen. Solange du sie nicht hast, ist
jede Entscheidung über 5.000 € eine Wette, keine Rechnung.

### Wofür das Geld sinnvoll weggeht — alles kleine Beträge

1. **Gewerbeanmeldung.** Ohne sie geht bei keinem der Anbieter ein
   Formular durch. Kostet je Gemeinde etwa 20 bis 60 €.
2. **AGB und Datenschutzerklärung von jemandem, der dafür haftet.**
   Du verkaufst an Gewerbetreibende und erstellst Inserate, für deren
   Inhalt gehaftet wird. Das ist der Punkt, an dem Sparen teuer wird —
   nicht die Datenbank.
3. **Erstgespräch Steuerberater.** Einmal, früh, bevor das erste Geld
   fließt.
4. **Portalverträge mobile.de / AutoScout24.** Das ist, was Händler
   wollen. Darin steckt dein Verkaufsargument, nicht in der Sitzheizung.
5. **Erst wenn ein Händler die Ausstattung tatsächlich vermisst:**
   50 bis 100 € Guthaben bei MrVIN, zum Testen.

Zusammen ein kleiner vierstelliger Betrag, und der Rest bleibt
Reserve — das ist der Unterschied zwischen investieren und ausgeben.

### Wann die DAT richtig wird

Bei rund 80 Inseraten im Monat trägt sich die Bronze-Partnerschaft aus
dem Rohertrag und du zahlst sie nicht aus der Reserve. Dann ist es ein
Einkauf. Heute wäre es eine Wette auf Kredit gegen dich selbst.

Das steht so auch schon im Entwurf an Weiermann — als „ich melde mich
wieder, sobald ich bei rund 80 Inseraten liege". Das ist kein Hinhalten,
das ist die Wahrheit.

---

## Anfrage an MrVIN

> Subject: API access request — listing software for German used car dealers
>
> Hello,
>
> I run 2Fast4Sale (2fast4sale.com), a listing tool for small German
> used car dealers. The dealer photographs the car and the registration
> document, and the software produces a complete listing for mobile.de
> and AutoScout24.
>
> The one piece I am missing is factory equipment per VIN. Your
> documentation describes the `equipment` field as the factory option
> list recorded against the VIN at build, with a standard/optional tier
> per item, for European VINs. That is exactly what I need, and your
> prepaid model without a subscription or minimum fits my own
> per-listing billing.
>
> Three questions before I apply:
>
> 1. **What is the price per report** for a low volume — fewer than 100
>    reports per month to start?
> 2. **For which German makes is the `equipment` list actually
>    populated?** Your docs say "where available for the make". I mostly
>    see VW, Audi, BMW, Mercedes, Opel, Skoda, Ford and Renault,
>    model years 2008 to 2022. If the list is empty for most of these,
>    the product does not help me and I would rather know now.
> 3. **May I run the lookup on behalf of my customer**, the dealer, for
>    a vehicle in their own stock, and write the result into their
>    listing? I do not resell data; each result goes only into the
>    listing of the dealer who requested it.
>
> I would also like to test before committing. Could I run five VINs
> from a real dealer's stock and compare the result against the
> vehicles' own paperwork? I am happy to pay for those five.
>
> To be straight with you about size: I am starting out and have no
> paying dealers yet, so the volume is small at first. I would rather
> tell you that than quote you a number I made up.
>
> Best regards
> Fabian Barjamasi
> 2Fast4Sale · 2fast4sale@gmail.com · 2fast4sale.com

Zugang läuft über „Request access" auf
<https://www.mrvin.com/developers/vin-decoder-api/>.

Dieselben drei Fragen gehen an Schwacke: `customer@jdpower.com`,
Produkt Autovista API / VIN API, Preis je Abruf ohne Grundgebühr.
