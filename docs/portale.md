# mobile.de und AutoScout24 — was noch fehlt

Stand: 2. Oktober 2026.

## Warum das vor DAT kommt

Beides sind Schnittstellen zu Dritten, aber sie sind nicht vergleichbar:

| | DAT | mobile.de / AutoScout24 |
|---|---|---|
| Braucht der **Händler** einen eigenen Vertrag? | Ja, einen neuen | Ja — **hat er schon** |
| Zusätzliche Kosten für den Händler | Ja | **Keine** |
| Kosten für mich | 354 € im Monat | AutoScout24 nennt die API ausdrücklich kostenlos; bei mobile.de ist der API-Zugang Teil des Händlerzugangs |
| Was es für den Händler ändert | Ausstattungsliste wird genauer | Er muss das Inserat **nicht mehr selbst einstellen** |

Der Unterschied ist der erste Punkt. Bei DAT müsste sich jeder Händler
für ein einzelnes Inserat extra anmelden — das tut niemand. Bei den
Portalen ist er längst Kunde und zahlt dort schon für seine Anzeigen;
die Schnittstelle schreibt nur in das Konto, das er sowieso hat.

Und es ist das, was das Produkt verspricht: Aus dem Handyfoto wird ein
fertiges Inserat. Solange der Export fehlt, bekommt der Händler ein
Fotopaket und ein PDF und tippt danach alles noch einmal in zwei
Portale. Die Ausstattung aus der VIN ist dagegen Feinschliff — die
bekommt er heute aus dem Fahrzeugschein, aus den Fotos und aus seinem
eigenen Datenblatt.

**Reihenfolge: Portale, dann die ersten Händler, dann DAT.**

## Was technisch steht

Beide Routen sind fertig und machen das Richtige:

- `app/api/mobilede-publish/route.ts` — Bilder zuerst, dann das Inserat
  mit den Verweisen; `X-Mobile-Insertion-Request-Id` macht das Anlegen
  wiederholbar (bricht die Verbindung ab, entsteht kein zweites
  Inserat); Sandbox über `MOBILEDE_SANDBOX=true` auf
  `services.sandbox.mobile.de`.
- `app/api/autoscout24-publish/route.ts` — dasselbe Muster, Testmodus
  über den Kopf `X-Testmode`; 202 wird richtig als „noch nicht aktiv"
  behandelt, nicht als Erfolg.
- Ohne Zugangsdaten antworten beide mit einem **Trockenlauf**: Sie
  zeigen, was rausgehen würde, und nennen die fehlenden Pflichtangaben.
  Das kannst du heute schon prüfen.
- Die Fotos werden seit dem 2. Oktober auch als Speicher-Adresse
  angenommen und nach JPEG umgewandelt (`lib/bildHolen.ts`). Vorher
  erwarteten beide Routen Base64 — mit den Adressen aus Schritt 2 wäre
  jedes Inserat ohne ein einziges Bild rausgegangen.

## Was fehlt — in dieser Reihenfolge

### 1. Gewerbe (ab 5. Oktober)

Beide Portale verlangen einen gewerblichen Zugang. Ohne Gewerbeanmeldung
gibt es keinen Händlerzugang und damit keine Zugangsdaten.

### 2. Zugang beantragen

**AutoScout24:** Die API ist laut Händlerportal kostenlos. Der Weg für
Software läuft über „Datenpartner"; es gibt eigene Datenpartner-AGB.

- E-Mail: `daten@autoscout24.com`
- Telefon: +49 89 44456-1000
- Doku: <https://listing-creation.api.autoscout24.com/docs>
- Authentifizierung: Basic Auth gegen ein Konto bei AutoScout24, dazu
  eine `customerId` je Händler.

**mobile.de:** Es braucht ein API-Konto; Freischaltung und Zugangsdaten
gibt es nur über den Kundenservice.

- Telefon: +49 30 81097500
- Kontaktformular mit dem Betreff „API support request GERMANY":
  <https://www.mobile.de/service/contactForm?subject=API+support+request+GERMANY>
- Doku: <https://services.mobile.de/manual/index.html>
- Authentifizierung: Basic Auth, dazu eine `sellerId` je Händler.

### 3. Die Frage, die bei beiden zuerst geklärt sein muss

Wie wird ein **fremder** Händler freigegeben? Also: Der Händler ist
Kunde des Portals, ich bin der Softwareanbieter — wie autorisiert er
mich, in sein Konto einzustellen? Drei Formen sind üblich, und es macht
einen großen Unterschied, welche es ist:

1. Der Händler legt in seinem Portalkonto einen API-Benutzer an und gibt
   mir dessen Zugangsdaten. Einfach, aber ich verwahre fremde Passwörter.
2. Ich bekomme einen Datenpartner-Zugang und der Händler wird mir
   zugeordnet (bei AutoScout24 klingt es danach). Sauberste Form.
3. Pro Händler ein eigener Vertrag mit dem Portal — dann wäre es wie bei
   DAT, nur dass die Händler hier schon Kunden sind.

**Das ist die erste Frage in beiden Mails.** Davon hängt ab, wie die
Zugangsdaten gespeichert werden müssen — und das ist der einzige größere
Umbau, der noch aussteht (siehe Punkt 4).

### 4. Zugangsdaten je Händler (Code, noch offen)

Heute kommen die Zugangsdaten aus der Umgebung:
`MOBILEDE_API_USERNAME`, `MOBILEDE_API_PASSWORD`, `MOBILEDE_SELLER_ID`,
dazu die AutoScout24-Entsprechungen. Das ist **mein** Konto. Damit würde
jedes Inserat in meinem Namen eingestellt, nicht im Namen des Händlers.

Nötig ist je Händler ein Satz Zugangsdaten am Profil, verschlüsselt
gespeichert, und die Routen nehmen ihn statt der Umgebung. Das baue ich,
sobald aus Punkt 3 klar ist, welche Form es wird — vorher wäre es
geraten.

### 5. Die Knöpfe in Schritt 4

Sie stehen heute bewusst als „in Vorbereitung" da, ohne Funktion. Ein
Knopf, der nichts tut, ist schlimmer als keiner. Sie werden scharf
gestellt, sobald 2 bis 4 stehen.

## Entwurf: AutoScout24

> An: daten@autoscout24.com
> Betreff: Datenpartner-Zugang zur Listing Creation API
>
> Guten Tag,
>
> ich entwickle 2Fast4Sale, ein Werkzeug, mit dem Autohändler ihre
> Inserate erstellen: Der Fahrzeugschein wird abfotografiert und
> ausgelesen, die Fotos werden freigestellt und vor einen
> Studio-Hintergrund gesetzt, Titel und Beschreibung entstehen aus den
> Fahrzeugdaten. Am Ende soll das fertige Inserat in die Konten der
> Händler bei AutoScout24 und mobile.de übertragen werden.
>
> Die Anbindung an Ihre Listing Creation API ist fertig entwickelt und
> läuft bei mir gegen den Testmodus. Für den Betrieb fehlen mir der
> Zugang und die Antwort auf eine Frage:
>
> Wie wird ein Händler, der Ihr Kunde ist, mir als Datenpartner
> zugeordnet? Gibt er in seinem Konto eine Freigabe, oder läuft die
> Zuordnung über Sie?
>
> Zu mir, damit Sie wissen, mit wem Sie es zu tun haben: Ich bin
> Einzelunternehmer und starte gerade; zahlende Händler habe ich noch
> nicht. Die Software ist fertig, der Export ist das letzte fehlende
> Stück. Gern zeige ich Ihnen vorab Beispielinserate.
>
> Über die Datenpartner-AGB und das weitere Vorgehen würde ich mich
> freuen.
>
> Mit freundlichen Grüßen
> Fabian Barjamasi
> 2Fast4Sale · 2fast4sale@gmail.com · 2fast4sale.com

## Entwurf: mobile.de

> Betreff: API support request GERMANY — Zugang zur Seller-API
>
> Guten Tag,
>
> ich entwickle 2Fast4Sale, ein Werkzeug für Autohändler: Fahrzeugschein
> abfotografieren, Fotos ins Studio, Beschreibung erzeugen — und am Ende
> das fertige Inserat zu mobile.de übertragen.
>
> Die Anbindung an die Seller-API ist entwickelt (Bilder zuerst, dann
> das Inserat, `X-Mobile-Insertion-Request-Id` für Wiederholbarkeit).
> Ich bräuchte dafür:
>
> 1. ein API-Konto samt Zugangsdaten,
> 2. einen Zugang zur Sandbox (services.sandbox.mobile.de), um ohne
>    öffentliche Inserate zu testen,
> 3. eine Auskunft, wie die Freigabe durch einen Händler funktioniert:
>    Der Händler ist Ihr Kunde, meine Software soll in sein Konto
>    einstellen. Legt er dafür einen API-Benutzer an, oder gibt es einen
>    Weg über Sie?
>
> Ich bin Einzelunternehmer und starte gerade; zahlende Händler habe ich
> noch nicht. Beispielinserate kann ich Ihnen gern vorab zeigen.
>
> Mit freundlichen Grüßen
> Fabian Barjamasi
> 2Fast4Sale · 2fast4sale@gmail.com · 2fast4sale.com

## Und DAT?

Die Antwort an Herrn Weiermann (`docs/dat-antwort.md`) kannst du
trotzdem abschicken. Sie verpflichtet dich zu nichts und stellt nur die
zwei Fragen, die entscheiden, ob es je Abruf geht. Wenn seine Antwort
„nur mit eigenem Vertrag je Händler" lautet, ist das Thema für dieses
Jahr erledigt — und du hast nichts verloren.
