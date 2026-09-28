/*
 * Stapeltest ueber die GANZE Kette, so wie sie live laeuft.
 *
 * ── Warum es diesen Test gibt ─────────────────────────────────────
 *
 * Einzelne Bilder haben uns mehrfach getaeuscht: Ein Foto gelang, das
 * naechste nicht, und ohne Zahlen war nie klar, ob eine Aenderung
 * wirklich etwas verbessert hat. Dieser Lauf misst, was zaehlt:
 *
 *   freigestellt   — hat U-2-Net ein brauchbares Fahrzeug geliefert?
 *   verfeinert     — hat Gemini das Bild angenommen, und wie stark?
 *   scheiben       — wurde am Fahrzeug selbst gearbeitet (Spiegelungen)?
 *   helligkeit     — vorher/nachher, gegen das Abdunkeln durch Gemini
 *   kennzeichen    — ist im Ergebnis noch etwas Kennzeichenfoermiges?
 *
 * Aufruf:
 *   npx tsx scripts/stapel-gesamt.ts [ordner] [anzahl] [raum]
 *
 * Ein Durchgang kostet rund 3 Cent je Foto (Gemini). Bei zehn Fotos
 * also etwa 30 Cent — der Preis dafuer, nicht mehr raten zu muessen.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { freistellenU2Net } from '../lib/studio/freistellenU2Net';
import { freistellGuete } from '../lib/studio/freistellGuete';
import { komponieren } from '../lib/studio/kompositor';
import { studioVerfeinernMitGemini, letzterGrund, anteilGeaendertImKasten } from '../lib/studio/geminiStudio';
import { kennzeichenAufServerFinden } from '../lib/studio/kennzeichenModell';
import { raum, raumBild } from '../lib/studio/raeume';

sharp.concurrency(1);

interface Zeile {
  datei: string;
  freigestellt: boolean;
  guete: string;
  verfeinert: number | string;
  bildGeaendert: number;
  scheiben: number;
  hellVorher: number;
  hellNachher: number;
  kennzeichenOffen: boolean | null;
  sekunden: number;
}

async function main() {
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }

  const ordner = process.argv[2] ?? 'tools/proben/eingang';
  const anzahl = Number(process.argv[3] ?? '10');
  const raumName = process.argv[4] ?? 'studio_anthrazit';
  const ziel = 'tools/proben/stapel_gesamt';
  fs.mkdirSync(ziel, { recursive: true });

  const r = raum(raumName);
  if (!r) throw new Error('Raum unbekannt: ' + raumName);
  const hg = raumBild(r);

  const dateien = fs.readdirSync(ordner)
    .filter((d) => /\.(jpe?g|png|webp)$/i.test(d))
    .slice(0, anzahl);

  const zeilen: Zeile[] = [];
  for (const datei of dateien) {
    const start = Date.now();
    const z: Zeile = {
      datei, freigestellt: false, guete: '', verfeinert: '-', bildGeaendert: 0,
      scheiben: 0, hellVorher: 0, hellNachher: 0, kennzeichenOffen: null, sekunden: 0,
    };
    try {
      const roh = fs.readFileSync(path.join(ordner, datei));
      const frei = await freistellenU2Net(roh);
      const guete = await freistellGuete(frei);
      z.freigestellt = guete.brauchbar;
      z.guete = guete.brauchbar ? 'ok' : (guete.grund ?? 'unbrauchbar');

      if (guete.brauchbar) {
        const e = await komponieren(frei, hg, {
          horizont: r.horizont, kameraHoehe: r.kameraHoehe, brennweite: r.brennweite,
          wandlinie: (r as { wandlinie?: number }).wandlinie, spiegelungStaerke: r.bodenglanz,
        });
        z.hellVorher = Math.round((await sharp(e.bild).stats()).channels[0].mean);

        const fein = await studioVerfeinernMitGemini(e.bild, 'ViBa Automobile');
        if (fein) {
          z.verfeinert = Number(fein.aehnlich.toFixed(3));
          z.bildGeaendert = Number(fein.geaendert.toFixed(1));
          z.hellNachher = Math.round((await sharp(fein.bild).stats()).channels[0].mean);

          const em = await sharp(e.fahrzeugEbene.bild).metadata();
          z.scheiben = Number((await anteilGeaendertImKasten(e.bild, fein.bild, {
            left: Math.max(0, e.fahrzeugEbene.left),
            top: Math.max(0, e.fahrzeugEbene.top),
            width: Math.max(8, Math.min(em.width ?? 0, e.breite - e.fahrzeugEbene.left)),
            height: Math.max(8, Math.round((em.height ?? 0) * 0.55)),
          })).toFixed(1));

          const fund = await kennzeichenAufServerFinden(fein.bild);
          z.kennzeichenOffen = fund !== 'keins' && fund !== null;
          await sharp(fein.bild).resize(900).jpeg({ quality: 85 })
            .toFile(path.join(ziel, datei.replace(/\.[^.]+$/, '') + '.jpg'));
        } else {
          z.verfeinert = 'verworfen: ' + letzterGrund.slice(0, 40);
          z.hellNachher = z.hellVorher;
          await sharp(e.bild).resize(900).jpeg({ quality: 85 })
            .toFile(path.join(ziel, datei.replace(/\.[^.]+$/, '') + '.jpg'));
        }
      }
    } catch (err) {
      z.guete = 'Fehler: ' + (err instanceof Error ? err.message : String(err)).slice(0, 60);
    }
    z.sekunden = Math.round((Date.now() - start) / 100) / 10;
    zeilen.push(z);
    console.log(
      z.datei.slice(0, 26).padEnd(28),
      (z.freigestellt ? 'frei ok ' : 'FREI ' + z.guete.slice(0, 12)).padEnd(22),
      String(z.verfeinert).padEnd(22),
      ('Bild ' + z.bildGeaendert + '%').padEnd(12),
      ('Scheiben ' + z.scheiben + '%').padEnd(16),
      ('hell ' + z.hellVorher + '->' + z.hellNachher).padEnd(16),
      z.kennzeichenOffen === null ? '' : (z.kennzeichenOffen ? 'KENNZEICHEN OFFEN' : 'kz zu'),
      z.sekunden + ' s',
    );
  }

  const csv = ['datei;freigestellt;guete;verfeinert;bild_geaendert;scheiben;hell_vorher;hell_nachher;kennzeichen_offen;sekunden']
    .concat(zeilen.map((z) => [
      z.datei, z.freigestellt, z.guete, z.verfeinert, z.bildGeaendert, z.scheiben,
      z.hellVorher, z.hellNachher, z.kennzeichenOffen, z.sekunden,
    ].join(';')));
  fs.writeFileSync(path.join(ziel, 'ergebnis.csv'), csv.join('\n'), 'utf8');

  const ok = zeilen.filter((z) => z.freigestellt).length;
  const verf = zeilen.filter((z) => typeof z.verfeinert === 'number').length;
  const scheibenOk = zeilen.filter((z) => z.scheiben >= 1.5).length;
  const kzOffen = zeilen.filter((z) => z.kennzeichenOffen === true).length;
  console.log('\n── Zusammenfassung ──');
  console.log('Fotos:', zeilen.length);
  console.log('Freigestellt brauchbar:', ok, '(' + Math.round((ok / zeilen.length) * 100) + '%)');
  console.log('Von Gemini angenommen:', verf, '(' + Math.round((verf / Math.max(1, ok)) * 100) + '% der brauchbaren)');
  console.log('Scheiben angefasst:', scheibenOk);
  console.log('Kennzeichen noch offen:', kzOffen);
  console.log('Bilder in', ziel);
}

main();
