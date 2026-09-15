# Freistell-Server einrichten

Einmalig, rund 15 Minuten. Kostenlos, keine Kreditkarte.

## 1. Konto bei Hugging Face

1. Auf **huggingface.co** ein Konto anlegen und die E-Mail bestätigen.

## 2. Space anlegen

1. Oben rechts auf dein Profilbild → **New Space**.
2. Einstellungen:
   - **Space name:** `freisteller`
   - **License:** `mit`
   - **Select the Space SDK:** **Docker** → **Blank**
   - **Space hardware:** **CPU basic · 2 vCPU · 16 GB · FREE**
   - **Public** (bei Private kann die Website den Server nicht erreichen)
3. **Create Space**.

## 3. Dateien hochladen

Im neuen Space auf **Files** → **Add file** → **Upload files** und diese vier
Dateien aus `server/freisteller/` hineinziehen:

- `Dockerfile`
- `package.json`
- `server.mjs`
- `README.md`

Unten auf **Commit changes to main**. Danach baut der Space, das dauert beim
ersten Mal einige Minuten. Fertig ist er, wenn oben **Running** steht und die
Seite „2Fast4Sale Freisteller läuft" zeigt.

## 4. Adresse in Vercel eintragen

Die Adresse des Servers hat die Form

    https://DEINNAME-freisteller.hf.space

In Vercel → Projekt → **Settings** → **Environment Variables** eintragen:

| Name | Wert |
|---|---|
| `NEXT_PUBLIC_FREISTELLER_URL` | `https://DEINNAME-freisteller.hf.space` |

Danach in Vercel einmal **Redeploy**, damit die Website die Adresse kennt.

## Was man wissen muss

- **Geschwindigkeit:** rund 1 bis 2 Minuten je Foto. Im Oktober auf einen
  bezahlten Server mit mehr Kernen umziehen, dann sind es Sekunden.
- **Schlafmodus:** Ein kostenloser Space schläft nach 48 Stunden ohne Anfrage
  ein. Die erste Anfrage danach weckt ihn und dauert einige Minuten länger.
- **Nur 2fast4sale.com darf anfragen.** Soll auch eine Testadresse erlaubt
  sein, im Space unter **Settings → Variables** `ERLAUBTE_HERKUNFT` setzen,
  mehrere Adressen durch Komma getrennt.
