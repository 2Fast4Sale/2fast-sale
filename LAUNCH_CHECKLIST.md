# Was bis live wirklich noch fehlt

Stand 11.11.2026. Die alte Liste war nicht mehr wahr: Impressum, Datenschutz,
AGB, Kontakt, Kündigung und ein Cookie-Banner sind da, die Portal-Routen für
mobile.de und AutoScout24 auch. Hier steht nur noch, was tatsächlich offen ist.

## Geprüft am 11.11.2026

- `npm install --ignore-scripts` läuft durch (500 Pakete).
- `next build` läuft fehlerfrei durch. Alle Seiten werden erzeugt: Start,
  Features, Preise, Onboarding, Auth, Dashboard mit Inserat-Assistent
  (Schritt 1 bis 4), Studio, Galerie, Posteingang, Einstellungen mit Abo,
  Abrechnung, 2FA, Händlerprofil und Portalzugängen, Checkout,
  Zahlungsbestätigung, Vorschau, öffentliche Inseratsseite, Impressum,
  Datenschutz, AGB, Kontakt, Kündigung.
- Vorhandene API-Routen unter anderem: Stripe (Setup, Checkout, Portal,
  Kündigung, Webhook), Credits, Abrechnung, Bildverarbeitung, Studio, OCR für
  Fahrzeugscheine, Ausstattungserkennung, Beschreibung und Titel,
  mobile.de-Anzeigen und -Veröffentlichung, AutoScout24-Veröffentlichung,
  PDF- und ZIP-Export.

**Wichtig:** Ein sauberer Build heißt nur, dass der Code übersetzt. Ob
Supabase, Stripe und Gemini im Zusammenspiel tun, was sie sollen, ist damit
nicht geprüft. Das zeigt erst der erste echte Durchlauf.

## Ohne das geht gar nichts

1. **Supabase-Projekt aufsetzen** und alle Migrationen `001` bis `026` der
   Reihe nach im SQL-Editor ausführen. Keine überspringen, sie bauen
   aufeinander auf. — ca. 30 Minuten
2. **GEMINI_API_KEY** besorgen und eintragen. Ohne ihn steht die
   Bildverarbeitung, also der Kern. — 10 Minuten
3. **Stripe**: Produkte über `POST /api/stripe/setup` anlegen, Price IDs in
   die Umgebung, Webhook im Stripe-Dashboard anlegen,
   `STRIPE_WEBHOOK_SECRET` eintragen, Kundenportal aktivieren. — ca. 1 Stunde
4. **Hosting** (Vercel oder gleichwertig), alle Umgebungsvariablen dorthin,
   `NEXT_PUBLIC_APP_URL` auf die echte Domain. — ca. 1 Stunde
5. **Einmal komplett durchspielen** als echter Nutzer: anmelden, Fahrzeug
   anlegen, Fotos hoch, Beschreibung erzeugen, bezahlen, Inserat ansehen.
   Was dabei bricht, ist die eigentliche Liste. — ca. 2 Stunden

Summe: ein Arbeitstag, wenn nichts Unerwartetes passiert.

## Danach, nicht vorher

- VINDECODER_API_KEY prüfen, der alte gibt 404.
- Zugangsdaten für mobile.de und AutoScout24 beantragen. Solange die fehlen,
  darf kein Tarif damit beworben werden, der die Übertragung verspricht.
- Team-Accounts und API-Zugang für den Business-Tarif.

## Was den Start trotzdem kippen kann

- **Der Zielkunde ist unbestätigt.** Laut DAT-Antwort in `docs/dat-antwort-2.md`
  stellt ein Händler mit SilverDAT seine Inserate schon heute auf alle Börsen.
  Dein Kunde ist der Händler *ohne* solche Lizenz. Wie viele das sind, weiß
  niemand. Erste Frage an jeden Händler: „Haben Sie SilverDAT oder Schwacke?"
- **Freistellen wird zur Allerweltsfunktion.** Das kann inzwischen jedes
  Telefon. Der Teil des Werts, der bleibt, sind Ausstattung aus Unterlagen,
  Beschreibung und Portalexport.
- **Marge je Inserat ungeprüft.** Was ein Durchlauf an Gemini-Kosten
  verursacht, muss gegen 7,50 Euro gerechnet werden, bevor der Preis steht.
