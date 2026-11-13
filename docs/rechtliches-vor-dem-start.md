# Was rechtlich fehlt — die Liste für den Anwalt

Stand: 13. November 2026. Entstanden aus der Frage, ob Fahrzeugscheine
per Chat verschickt werden dürfen. Die Antwort darauf hat ein Loch
aufgedeckt, das größer ist als die Frage.

## 1. Der AV-Vertrag — ohne ihn kannst du keinen Kunden annehmen

Das ist der wichtigste Punkt auf dieser Liste, und er stand bisher
nirgends.

Dein Produkt empfängt **Fahrzeugscheine von Händlern**. Eine
Zulassungsbescheinigung Teil I enthält in den Feldern C.1.1 bis C.1.3
Name und Adresse des Halters — personenbezogene Daten eines Dritten,
nämlich des Vorbesitzers.

Damit verarbeitest du Daten **im Auftrag des Händlers**. Er ist der
Verantwortliche, du der Auftragsverarbeiter. Dafür verlangt Art. 28
DSGVO einen schriftlichen Auftragsverarbeitungsvertrag. Den gibt es
nicht.

**Warum das kein Formalismus ist:**

- Ohne AV-Vertrag begeht jeder Händler, der 2Fast4Sale benutzt, einen
  Verstoß — und du mit ihm.
- Ein Händler mit halbwegs wachem Steuerberater fragt danach. Dann
  stehst du im Verkaufsgespräch ohne Antwort da, und zwar an der
  Stelle, an der es um Vertrauen geht.
- Du leitest die Daten weiter: Anthropic (USA) liest den Schein, Google
  (Gemini) die Fotos. Diese Unterauftragsverarbeiter müssen im
  AV-Vertrag benannt und vom Händler genehmigt sein.

Die Datenschutzerklärung nennt dich unter Punkt 1 als
„Verantwortlichen". Für die Fahrzeugdaten eines Händlerfahrzeugs ist
das **falsch** — dort ist es der Händler. Beides zugleich stimmt nicht,
und die Erklärung unterscheidet es nicht.

**Lösung:** Ein AV-Vertrag als Anhang zu den AGB, den der Händler bei
der Anmeldung mit annimmt. Standardtexte dafür gibt es; prüfen lassen
muss man die Liste der Unterauftragsverarbeiter (Supabase, Anthropic,
Google, Stripe, Vercel) und die Löschfristen. Das ist eine Stunde beim
Anwalt, nicht ein Projekt.

## 2. Platzhalter in Rechtstexten

Drei Stellen stehen noch in Klammern:

| Datei | Zeile | fehlt |
|---|---|---|
| `app/datenschutz/page.tsx` | 36 | `[Straße, PLZ, Stadt]` |
| `app/agb/page.tsx` | 35 | `[Straße, PLZ, Stadt]` |
| `app/agb/page.tsx` | 215 | `[Stadt des Unternehmenssitzes]` (Gerichtsstand) |

Das sind keine Schönheitsfehler. Impressum und Datenschutzerklärung
müssen eine vollständige, ladungsfähige Anschrift nennen; eine
Erklärung mit Klammern ist eine fehlende Pflichtangabe und
abmahnfähig. Alle drei füllt die Gewerbeanmeldung automatisch — ein
Grund mehr, sie nicht aufzuschieben.

## 3. Kleinunternehmerregelung und der Datenpartner-Antrag

Das Impressum sagt: „Gemäß § 19 UStG wird keine Umsatzsteuer
ausgewiesen (Kleinunternehmerregelung)."

mobile.de verlangt für den Datenpartner-Zugang eine **Umsatzsteuer-ID**
(Punkt f der Anfrage, siehe `docs/mobilede-datenpartner.md`). Als
Kleinunternehmer bekommt man eine USt-IdNr. auf Antrag trotzdem — sie
ist nicht an den Verzicht auf § 19 gebunden. Das muss im Fragebogen
zur steuerlichen Erfassung aber **ausdrücklich angekreuzt** werden,
sonst kommt keine.

Zweite Rechnung, die dazugehört: Als Kleinunternehmer gibt es keinen
Vorsteuerabzug. Die Umsatzsteuer auf Google- und Anthropic-Rechnungen
ist Aufwand, nicht erstattungsfähig — bei 2,39 € Einkauf je Inserat
sind das rund 45 Cent, die bei Regelbesteuerung zurückkämen. Das ist
die Frage für den Steuerberater: ab welchem Umsatz lohnt der Verzicht
auf § 19. Nicht raten.

## 4. Die RMI-Zweckfrage

Aus `docs/ausstattung-direkt-vom-hersteller.md`: Der Zugang zu
Reparatur- und Wartungsinformationen nach Art. 61 VO (EU) 2018/858
wird für **Reparatur und Wartung** gewährt. Du willst die Daten für ein
**Verkaufsinserat**.

Ob ein Anbieter von Inseratssoftware „unabhängiger Wirtschaftsakteur"
im Sinne der Verordnung ist und ob die Nutzungsbedingungen der
Herstellerportale diesen Zweck zulassen, ist offen. Gehört auf dieselbe
Stunde, kostet nichts extra.

## 5. Was NICHT auf diese Liste gehört

Die Haftung für falsche Fahrzeugangaben. Die liegt beim Händler, nicht
bei dir — er stellt das Inserat ein, er verkauft, er sichert zu. Das
ist in den AGB sauber zu regeln, aber es ist kein offenes Risiko,
sondern eine Formulierung.

Technisch ist dafür schon getan, was geht:
`lib/beschreibungPruefen.ts` hält Zusicherungen zurück, die die Daten
nicht decken, und jede Erkennung lässt im Zweifel das Feld leer. Diese
Entscheidungen sind dokumentiert und mit Proben belegt — im Streitfall
ist das der Unterschied zwischen „Software hat etwas erfunden" und
„der Händler hat eine Angabe bestätigt".

---

## Reihenfolge

1. **Gewerbeanmeldung.** Füllt die drei Platzhalter und ist
   Voraussetzung für alles andere.
2. **ELSTER, Fragebogen zur steuerlichen Erfassung.** USt-IdNr.
   ausdrücklich beantragen. Dauert Wochen — deshalb sofort.
3. **Eine Stunde beim Anwalt**, mit dieser Liste: AV-Vertrag, AGB-Prüfung,
   Datenschutzerklärung, RMI-Zweckfrage. Nicht vier Termine.
4. **Steuerberater**, Erstgespräch: § 19 oder Regelbesteuerung.

Der AV-Vertrag ist dabei der einzige Punkt, der dich einen Kunden
kosten kann, bevor du ihn hast. Die anderen drei kosten nur Geld.
