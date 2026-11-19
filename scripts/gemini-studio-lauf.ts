/**
 * Ein Foto durch den GEMINI-Weg jagen -- genau den, der im Inserat laeuft.
 *
 *   npx tsx scripts/gemini-studio-lauf.ts <foto> [raum] [ziel.jpg]
 *
 * ── Warum dieses Skript ────────────────────────────────────────────
 *
 * Schritt 2 macht Gemini allein. Bildqualitaet darf also nur am
 * Gemini-Weg gemessen werden, nicht am eigenen Kompositor
 * (`stapel-test.ts`, seit dem 19.11.2026 gesperrt). Bis heute gab es
 * aber keinen Weg, EIN Foto durch Gemini zu schicken, ohne den Browser
 * und eine angemeldete Sitzung -- darum ist zweimal versehentlich der
 * eigene Weg gemessen worden.
 *
 * Die Reihenfolge ist dieselbe wie in
 * `app/api/studio-eigen/verarbeiten/route.ts`:
 *
 *   1. EXIF-Drehung anwenden (sonst steht das Auto auf der Nase)
 *   2. Kennzeichen mit EIGENEM Code abdecken -- Gemini hat die Aufgabe
 *      dreimal uebergangen, ein lesbares Kennzeichen ist ein
 *      personenbezogenes Datum
 *   3. Gemini malt das ganze Bild: freistellen, in den Raum stellen,
 *      Schatten, Licht, Scheiben, Haendlerschild
 *   4. Schild noch einmal selbst darueber, weil Gemini Buchstaben malt
 *      statt sie zu setzen
 *
 * Nach dem Bild laeuft die Maengelpruefung: ein zweites, lesendes
 * Modell bekommt Original und Ergebnis nebeneinander und sagt, was am
 * Fahrzeug zu sehen war und was davon im Studiobild fehlt.
 *
 * Kostet echtes Geld (Gemini rechnet je Bild ab) -- deshalb immer nur
 * ein Foto, nie ein Ordner.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { studioBildMitGemini, letzterGrund, ECHTE_BREITE } from '../lib/studio/geminiStudio';
import { raum, raumBild } from '../lib/studio/raeume';
import { kennzeichenAufServerFinden } from '../lib/studio/kennzeichenModell';
import { ersetzeKennzeichenImKasten } from '../lib/studio/kennzeichen';
import { maengelVergleichen } from '../lib/studio/maengelPruefen';

/* Schluessel aus .env.local -- dasselbe, was Next.js im Betrieb liest.
   tsx laedt sie nicht von selbst, und ohne GEMINI_API_KEY bricht der
   Lauf mit "kein Schluessel" ab, obwohl der Schluessel da ist. */
try {
  for (const zeile of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch { /* ohne Datei zaehlt nur, was schon in der Umgebung steht */ }

const [foto, raumName = 'galerie_dunkel', zielArg] = process.argv.slice(2);
if (!foto) {
  console.error('Aufruf: gemini-studio-lauf.ts <foto> [raum] [ziel.jpg]');
  process.exit(1);
}
if (!fs.existsSync(foto)) {
  console.error('Foto nicht gefunden: ' + foto);
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY fehlt. Ohne Schluessel liefert Gemini kein Bild.');
  process.exit(1);
}

const halle = raum(raumName);
if (!halle) {
  console.error('Raum unbekannt: ' + raumName);
  process.exit(1);
}

const ziel = zielArg ?? path.join('tools/proben/gemini', path.basename(foto, path.extname(foto)) + '_' + raumName + '.jpg');

async function main() {
  const hallenBild = raumBild(halle!);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  const start = Date.now();

  /* 1. EXIF-Drehung. */
  let roh = await sharp(fs.readFileSync(foto)).rotate().toBuffer();
  const ein = await sharp(roh).metadata();
  console.log('Eingang: ' + ein.width + 'x' + ein.height);

  /* 2. Kennzeichen abdecken, eigener Code. */
  let kennzeichenVorher = 'keins gefunden';
  try {
    const fund = await kennzeichenAufServerFinden(roh);
    if (fund && fund !== 'keins') {
      const kz = await ersetzeKennzeichenImKasten(roh, fund, null);
      if (kz.ersetzt) { roh = Buffer.from(kz.bild); kennzeichenVorher = 'abgedeckt'; }
    }
  } catch (err) {
    kennzeichenVorher = 'Fehler: ' + (err as Error).message;
  }
  console.log('Kennzeichen vor Gemini: ' + kennzeichenVorher);

  /* 3. Gemini malt. Zweiter Anlauf wie in der Route. */
  const zielBreite = Math.min(ECHTE_BREITE, 2000);
  const zielHoehe = Math.round(zielBreite / 1.5);
  let bilder = 0;
  const gezaehlt = (n: number) => { bilder += n; };

  let ki = await studioBildMitGemini(roh, hallenBild, zielBreite, zielHoehe, null, gezaehlt, 'neutral');
  if (!ki) {
    console.log('Erster Versuch nicht verwendbar (' + letzterGrund + '), zweiter Anlauf');
    ki = await studioBildMitGemini(roh, hallenBild, zielBreite, zielHoehe, null, gezaehlt, 'neutral');
  }
  if (!ki) {
    console.error('Gemini hat zweimal kein verwendbares Bild geliefert (' + letzterGrund + ').');
    console.error('Im Inserat greift hier der Rueckfall auf den eigenen Weg.');
    process.exit(2);
  }

  /* 4. Schild noch einmal selbst setzen. */
  let fertig = ki.bild;
  let schildNachher = 'Geminis Schild blieb stehen';
  try {
    const fund = await kennzeichenAufServerFinden(fertig);
    if (fund && fund !== 'keins') {
      const kz = await ersetzeKennzeichenImKasten(fertig, fund, null);
      if (kz.ersetzt) { fertig = kz.bild; schildNachher = 'selbst gezeichnet'; }
    } else {
      schildNachher = 'kein Schild gefunden';
    }
  } catch (err) {
    schildNachher = 'Fehler: ' + (err as Error).message;
  }

  fs.writeFileSync(ziel, fertig);
  const m = await sharp(fertig).metadata();
  const dauer = (Date.now() - start) / 1000;

  console.log('');
  console.log('Ausgang:            ' + m.width + 'x' + m.height);
  console.log('Aehnlichkeit:       ' + ki.aehnlich.toFixed(3));
  console.log('Geaenderte Flaeche: ' + ki.geaendert.toFixed(1) + ' %');
  console.log('Kennzeichen danach: ' + schildNachher);
  console.log('Bilder bei Google:  ' + bilder);
  console.log('Dauer:              ' + dauer.toFixed(1) + ' s');
  console.log('');
  const bericht = await maengelVergleichen(roh, fertig);
  if (!bericht) {
    console.log('Maengelpruefung: keine Antwort -- das Bild ist ungeprueft.');
  } else {
    console.log('Maengelpruefung (' + bericht.modell + '):');
    console.log('  im Originalfoto gesehen: ' + (bericht.gefunden.join('; ') || 'keine'));
    console.log('  im Studiobild VERSCHWUNDEN: ' + (bericht.verschwunden.join('; ') || 'keine'));
  }
  console.log('Datei:              ' + ziel);
}

main().catch((err) => { console.error(err); process.exit(1); });
