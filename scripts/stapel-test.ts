/**
 * Ganzen Ordner voller Fahrzeugfotos durch die Bildverarbeitung jagen.
 *
 *   npx tsx scripts/stapel-test.ts <ordner> [ziel] [raum]
 *
 * ── Wozu ───────────────────────────────────────────────────────────
 *
 * Bisher wurden Fehler an zwei Fotos gefunden: dem Urus und einem Golf.
 * Jeder Live-Test brachte einen neuen Fall ans Licht, den die beiden
 * nicht hatten — Schatten an der Wand, Balken auf dem Kotfluegel, Reste
 * vom alten Boden. Mit hundert Fotos findet man diese Faelle vorher,
 * statt sie beim Haendler zu entdecken, der 3,50 EUR bezahlt hat.
 *
 * Geprueft wird alles, was sich ohne menschliches Auge pruefen laesst:
 *
 *   - Freistellen ueberhaupt gelungen?
 *   - Wie gross ist das Fahrzeug im Bild, sitzt es mittig?
 *   - Radaufstandspunkte gefunden, und liegen sie plausibel?
 *   - Kennzeichen gefunden und ersetzt?
 *   - Dauer je Foto
 *
 * Am Ende stehen eine Tabelle (bericht.csv), eine Uebersicht aller
 * Ergebnisse (_uebersicht.jpg) und eine Liste der auffaelligen Bilder.
 * Die schaut sich dann ein Mensch an — aber nur die auffaelligen.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { freistellen as freistellenBiRefNet } from './freistellen-eigen';
import { komponieren, STANDARD, radaufstand } from '../lib/studio/kompositor';
import { raum, raumBild } from '../lib/studio/raeume';
import { kennzeichenAufServerFinden } from '../lib/studio/kennzeichenModell';
import { ersetzeKennzeichenImKasten } from '../lib/studio/kennzeichen';

const [ordner, ziel = 'tools/proben/stapel', raumName = 'galerie_dunkel'] = process.argv.slice(2);
if (!ordner) {
  console.error('Aufruf: stapel-test.ts <ordner mit Fotos> [zielordner] [raum]');
  process.exit(1);
}

/*
 * Zwei Freistellverfahren zur Wahl:
 *
 *   ormbg    dasselbe Modell wie im Browser des Haendlers (Standard).
 *            Schneller und zeigt genau die Fehler, die Kunden sehen.
 *   birefnet groesser, saubere Kanten, aber rund 100 Sekunden je Foto —
 *            bei hundert Fotos drei Stunden. Mit STAPEL_MODELL=birefnet.
 */
const MIT_BIREFNET = process.env.STAPEL_MODELL === 'birefnet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ormbg: any = null;
async function freistellen(fotoPfad: string): Promise<Buffer> {
  if (MIT_BIREFNET) return freistellenBiRefNet(fotoPfad);
  const { pipeline, RawImage } = await import('@huggingface/transformers');
  if (!ormbg) ormbg = await pipeline('background-removal', 'onnx-community/ormbg-ONNX', { dtype: 'q8' });
  const jpg = await sharp(fotoPfad).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 }).toBuffer();
  const bild = await RawImage.fromBlob(new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }));
  const aus = await ormbg(bild);
  const r = Array.isArray(aus) ? aus[0] : aus;
  return sharp(Buffer.from(r.data), { raw: { width: r.width, height: r.height, channels: r.channels } })
    .png().toBuffer();
}

const KACHEL = 480;
const SPALTEN = 5;

interface Zeile {
  datei: string;
  ok: boolean;
  anteilBreite: number;
  radAbstand: number;
  /** Anteil deckender Pixel am ganzen Foto. */
  deckung: number;
  /** Wie rechteckig die freigestellte Flaeche ist, 0 bis 1. */
  rechteckig: number;
  /** Anteil deckender Pixel auf der Randlinie des Rechtecks. */
  randVoll: number;
  kennzeichen: string;
  sekunden: number;
  hinweis: string;
}

/**
 * Beurteilt die Freistellung, ohne sie anzusehen.
 *
 * Im ersten Stapel ueber 51 Fotos blieb bei etwa jedem dritten Bild ein
 * rechteckiges Stueck Originalhintergrund stehen — Himmel, Hauswand,
 * Nachbarauto. Im fertigen Bild sieht man das sofort, die alten
 * Pruefungen meldeten aber nichts. Zwei Zahlen verraten es:
 *
 *   deckung     Anteil deckender Pixel am ganzen Foto. Ein freigestelltes
 *               Auto liegt bei 0,2 bis 0,5. Ueber 0,7 ist halbes Foto drin.
 *   rechteckig  Wie gut die Flaeche ihr umschliessendes Rechteck ausfuellt.
 *               Ein Auto hat Luft an den Ecken (0,5 bis 0,75). Ab 0,9 ist
 *               es ein Rechteck, also stehengebliebener Hintergrund.
 */
async function freistellungPruefen(frei: Buffer) {
  const { data, info } = await sharp(frei).ensureAlpha().extractChannel(3)
    .resize(400, 400, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let deckend = 0, xMin = info.width, xMax = -1, yMin = info.height, yMax = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 128) continue;
      deckend++;
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    }
  }
  const flaeche = info.width * info.height;
  const kasten = Math.max(1, (xMax - xMin + 1) * (yMax - yMin + 1));

  /*
   * Die aussagekraeftigste Zahl: Wie viel vom RAND des umschliessenden
   * Rechtecks ist deckend?
   *
   * Ein Auto beruehrt sein Rechteck nur an wenigen Stellen — Dach, Reifen,
   * Stossstangen —, der Rest der Randlinie ist leer. Bleibt dagegen ein
   * Stueck Originalfoto stehen, ist der Rand rundherum deckend. Deckung
   * und Rechteckigkeit allein trennten das nicht: Ein sauber
   * freigestellter Golf kam auf dieselben Werte wie ein Bild mit halber
   * Hauswand drin.
   */
  let rand = 0, randDeckend = 0;
  if (xMax >= xMin && yMax >= yMin) {
    const test = (x: number, y: number) => {
      rand++;
      if (data[y * info.width + x] >= 128) randDeckend++;
    };
    for (let x = xMin; x <= xMax; x++) { test(x, yMin); test(x, yMax); }
    for (let y = yMin; y <= yMax; y++) { test(xMin, y); test(xMax, y); }
  }

  return {
    deckung: deckend / flaeche,
    rechteckig: deckend / kasten,
    randVoll: rand ? randDeckend / rand : 0,
    randKontakt: xMin <= 1 && xMax >= info.width - 2,
  };
}

async function main() {
  const halle = raum(raumName);
  if (!halle) throw new Error('Raum nicht gefunden: ' + raumName);
  fs.mkdirSync(ziel, { recursive: true });

  const fotos = fs.readdirSync(ordner)
    // avif und bmp gehoeren dazu: Fotos aus dem Netz kommen oft so, und
    // sharp liest sie ohnehin.
    .filter((f) => /\.(jpe?g|png|webp|avif|bmp|tiff?)$/i.test(f))
    .sort();
  console.log(`${fotos.length} Fotos, Raum ${halle.titel}\n`);

  const zeilen: Zeile[] = [];
  const kacheln: Buffer[] = [];

  for (const [i, datei] of fotos.entries()) {
    const start = Date.now();
    const z: Zeile = {
      datei, ok: false, anteilBreite: 0, radAbstand: 0,
      deckung: 0, rechteckig: 0, randVoll: 0, kennzeichen: '—', sekunden: 0, hinweis: '',
    };
    try {
      const frei = await freistellen(path.join(ordner, datei));
      const guete = await freistellungPruefen(frei);
      z.deckung = guete.deckung;
      z.rechteckig = guete.rechteckig;
      z.randVoll = guete.randVoll;

      /*
       * Kennzeichen wie im Betrieb: erst suchen, dann ersetzen. Findet
       * das Modell nichts, bleibt das Bild unveraendert.
       */
      let auto = frei;
      const fund = await kennzeichenAufServerFinden(frei);
      if (fund && fund !== 'keins') {
        const kz = await ersetzeKennzeichenImKasten(frei, fund, 'Autohaus Muster');
        auto = kz.bild;
        z.kennzeichen = `ersetzt (${kz.winkel?.toFixed(0)}°)`;
      } else {
        z.kennzeichen = fund === 'keins' ? 'keins gefunden' : 'Modell nicht verfügbar';
      }

      const e = await komponieren(auto, raumBild(halle), {
        ...STANDARD,
        horizont: halle.horizont, kameraHoehe: halle.kameraHoehe, brennweite: halle.brennweite,
      });
      fs.writeFileSync(path.join(ziel, datei.replace(/\.\w+$/, '.jpg')), e.bild);

      /* ── Messwerte, die einen Fehler verraten ── */
      z.anteilBreite = e.messwerte.fahrzeugBreite / e.breite;
      const kontakt = await radaufstand(e.fahrzeugEbene.bild, e.messwerte.fahrzeugBreite, e.messwerte.fahrzeugHoehe);
      if (kontakt) z.radAbstand = Math.abs(kontakt.radB - kontakt.radA) / e.messwerte.fahrzeugBreite;

      // Auffaellig? Diese Grenzen kommen aus den bisher gefundenen Fehlern.
      const hinweise: string[] = [];
      if (z.randVoll > 0.55) hinweise.push('Freistellung: Hintergrund steht noch drin');
      if (z.rechteckig < 0.45) hinweise.push('Freistellung: nur Bruchstuecke erkannt');
      if (z.deckung < 0.10) hinweise.push('Freistellung: fast nichts uebrig');
      if (guete.randKontakt) hinweise.push('beruehrt linken und rechten Rand');
      if (z.radAbstand < 0.25) hinweise.push('Raeder zu dicht beieinander');
      if (e.messwerte.fahrzeugHoehe > e.hoehe * 0.85) hinweise.push('Fahrzeug fuellt das Bild');
      if (e.messwerte.helligkeitFahrzeug < 25) hinweise.push('Fahrzeug fast schwarz');
      z.hinweis = hinweise.join('; ');
      z.ok = true;

      kacheln.push(await sharp(e.bild).resize(KACHEL).jpeg({ quality: 78 }).toBuffer());
    } catch (err) {
      z.hinweis = 'FEHLER: ' + String((err as Error)?.message ?? err).slice(0, 120);
    }
    z.sekunden = Number(((Date.now() - start) / 1000).toFixed(1));
    zeilen.push(z);
    console.log(
      `${String(i + 1).padStart(4)}/${fotos.length}  ${datei.padEnd(34).slice(0, 34)}` +
      `  ${z.sekunden.toFixed(1).padStart(5)} s  ${z.kennzeichen.padEnd(18)}${z.hinweis}`,
    );
  }

  /* ── Bericht ── */
  const csv = ['datei;ok;anteil_breite;rad_abstand;deckung;rechteckig;rand_voll;kennzeichen;sekunden;hinweis']
    .concat(zeilen.map((z) => [
      z.datei, z.ok ? 'ja' : 'nein', z.anteilBreite.toFixed(3),
      z.radAbstand.toFixed(3), z.deckung.toFixed(3), z.rechteckig.toFixed(3),
      z.randVoll.toFixed(3), z.kennzeichen, z.sekunden, z.hinweis,
    ].join(';')));
  fs.writeFileSync(path.join(ziel, 'bericht.csv'), csv.join('\n'), 'utf8');

  if (kacheln.length) {
    const hoehen = await Promise.all(kacheln.map(async (k) => (await sharp(k).metadata()).height ?? KACHEL));
    const zeilenHoehe = Math.max(...hoehen);
    const reihen = Math.ceil(kacheln.length / SPALTEN);
    await sharp({
      create: {
        width: KACHEL * SPALTEN, height: zeilenHoehe * reihen,
        channels: 3, background: { r: 24, g: 24, b: 26 },
      },
    })
      .composite(kacheln.map((input, n) => ({
        input, left: (n % SPALTEN) * KACHEL, top: Math.floor(n / SPALTEN) * zeilenHoehe,
      })))
      .jpeg({ quality: 82 })
      .toFile(path.join(ziel, '_uebersicht.jpg'));
  }

  const fehler = zeilen.filter((z) => !z.ok || z.hinweis);
  console.log(`\nFertig. ${zeilen.length - fehler.length} von ${zeilen.length} ohne Auffaelligkeit.`);
  if (fehler.length) {
    console.log('\nAnzusehen:');
    for (const z of fehler) console.log(`  ${z.datei}: ${z.hinweis || 'fehlgeschlagen'}`);
  }
  const schnitt = zeilen.reduce((s, z) => s + z.sekunden, 0) / Math.max(1, zeilen.length);
  console.log(`\nDurchschnitt ${schnitt.toFixed(1)} s je Foto → ${ziel}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
