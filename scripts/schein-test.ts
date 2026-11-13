/**
 * Prueft das Auslesen von Fahrzeugscheinen an echten Fotos.
 *
 *   npx tsx scripts/schein-test.ts <ordner> [wahrheit.csv]
 *
 * ── Warum ──────────────────────────────────────────────────────────
 *
 * Schritt 1 ist der Schritt, an dem ein Fehler richtig weh tut: Was hier
 * falsch gelesen wird, steht ungeprueft als Zusicherung im Inserat — 81
 * kW statt 110, ein Dreher in der FIN, das falsche Erstzulassungsdatum.
 * Der Haendler haftet dafuer, und er bezahlt uns dafuer.
 *
 * Bisher wurde das nie mit vielen echten Scheinen geprueft. Dieser Test
 * schickt jedes Foto durch dieselbe Route wie die Webseite und vergleicht
 * Feld fuer Feld mit den Werten, die ein Mensch vom Papier abgelesen hat.
 *
 * ── So wird er benutzt ─────────────────────────────────────────────
 *
 * 1. Fahrzeugscheine fotografieren, Halterdaten (Name, Adresse) abdecken.
 * 2. Fotos in einen Ordner legen, z.B. tools/proben/scheine.
 * 3. Eine Datei wahrheit.csv daneben legen, Semikolon getrennt:
 *
 *      datei;marke;fin;erstzulassung;ps;hubraum;kraftstoff;farbe
 *      schein01.jpg;Volkswagen Golf VII 1.6 TDI;WVWZZZ...;06/2015;110;1598;Diesel;Schwarz
 *
 *    Leere Zellen werden nicht geprueft. Wer nur FIN und kW eintraegt,
 *    prueft eben nur diese zwei — besser als nichts.
 * 4. Der Test meldet je Feld Treffer und Abweichungen.
 *
 * ── Kosten ─────────────────────────────────────────────────────────
 *
 * Jedes Foto ist ein Aufruf des Sprachmodells, wenige Cent je Schein.
 * Der Test laeuft nur, wenn ANTHROPIC_API_KEY gesetzt ist.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { POST } from '../app/api/scan-doc/route';

const [ordner, wahrheitDatei] = process.argv.slice(2);
if (!ordner) {
  console.error('Aufruf: schein-test.ts <ordner> [wahrheit.csv]');
  process.exit(1);
}
/*
 * --auch-kleine schickt auch Bilder, die die Vorpruefung aussortiert
 * hat. Nur sinnvoll, wenn man die Grenze selbst pruefen will.
 */
const auchKleine = process.argv.includes('--auch-kleine');

/*
 * ── Warum eine Vorpruefung ─────────────────────────────────────────
 *
 * Der erste Lauf dieses Tests waere Geld fuer eine Zahl ohne Bedeutung
 * gewesen: neun Bilder im Ordner, davon zwei byteidentisch und sieben
 * zu klein, um eine FIN zu enthalten, die ein Mensch lesen koennte.
 *
 * Die Rechnung dahinter: Eine Zulassungsbescheinigung Teil I ist A5,
 * lange Kante 210 mm. Die Eintraege sind etwa 2 mm hoch. Anthropic
 * rechnet jedes Bild auf hoechstens 1568 px lange Kante herunter —
 * mehr bringt also nichts, weniger schon.
 *
 *   1568 px / 210 mm = 7,5 px/mm → 15 px Zeichenhoehe. Lesbar.
 *   1200 px / 210 mm = 5,7 px/mm → 11 px. Knapp.
 *    640 px / 210 mm = 3,0 px/mm →  6 px. Aussichtslos.
 *
 * Darum: unter 1200 px lange Kante wird nicht geschickt, zwischen 1200
 * und 1568 gewarnt. Und: Ein Handyfoto hat 3000 px und EXIF mit
 * Geraetenamen. Fehlt beides, ist es kein Foto eines Papiers, sondern
 * ein Bild aus dem Netz — dann misst der Test etwas anderes als den
 * Betrieb.
 */
const MINDESTKANTE = 1200;
const GUTEKANTE = 1568;

type Vorpruefung = { datei: string; kante: number; geraet: string | null; grund: string | null };

async function vorpruefen(ordner: string, dateien: string[]): Promise<Vorpruefung[]> {
  const gesehen = new Map<string, string>();
  const ergebnis: Vorpruefung[] = [];
  for (const datei of dateien) {
    const roh = fs.readFileSync(path.join(ordner, datei));
    const hash = crypto.createHash('md5').update(roh).digest('hex');
    let kante = 0;
    let geraet: string | null = null;
    try {
      const m = await sharp(roh).metadata();
      kante = Math.max(m.width ?? 0, m.height ?? 0);
      if (m.exif) {
        const treffer = m.exif.toString('latin1')
          .match(/Apple|iPhone|Samsung|Google|Pixel|Xiaomi|HUAWEI|OnePlus|Canon|NIKON|SONY/i);
        geraet = treffer ? treffer[0] : null;
      }
    } catch {
      ergebnis.push({ datei, kante: 0, geraet: null, grund: 'nicht lesbar' });
      continue;
    }
    const doppelt = gesehen.get(hash);
    gesehen.set(hash, doppelt ?? datei);
    const grund = doppelt ? `byteidentisch mit ${doppelt}`
      : kante < MINDESTKANTE ? `nur ${kante} px lange Kante, mindestens ${MINDESTKANTE}`
      : null;
    ergebnis.push({ datei, kante, geraet, grund });
  }
  return ergebnis;
}

/** Feldnamen in der CSV → Feldnamen in der Antwort der Route. */
const FELDER: Record<string, string[]> = {
  marke:          ['brand'],
  fin:            ['vin'],
  erstzulassung:  ['firstRegistration'],
  hubraum:        ['displacementCcm'],
  // Die Route rechnet kW in PS um und loescht powerKw; in der CSV also
  // die PS eintragen, wie sie im Inserat stehen sollen.
  ps:             ['powerPs'],
  kraftstoff:     ['fuelType'],
  farbe:          ['color'],
  sitze:          ['seats'],
  leermasse:      ['leermasseKg'],
  tueren:         ['doors'],
  schadstoffklasse: ['emissionClass'],
  antrieb:        ['driveType'],
  aufbau:         ['aufbau'],
  anhaengelast_gebremst:   ['anhaengelastGebremstKg'],
  anhaengelast_ungebremst: ['anhaengelastUngebremstKg'],
};

/** Vergleich ohne Rücksicht auf Gross- und Kleinschreibung, Leerzeichen, Punkte. */
function gleich(a: unknown, b: unknown): boolean {
  const norm = (x: unknown) => String(x ?? '')
    .toLowerCase().replace(/[\s.\-_]/g, '').trim();
  return norm(a) === norm(b);
}

function wert(antwort: Record<string, unknown>, namen: string[]): unknown {
  for (const n of namen) {
    if (antwort[n] !== undefined && antwort[n] !== null && antwort[n] !== '') return antwort[n];
  }
  return null;
}

async function main() {
  const alle = fs.readdirSync(ordner)
    .filter((f) => /\.(jpe?g|png|webp|avif|heic)$/i.test(f))
    .sort();
  if (!alle.length) { console.error('Keine Fotos in', ordner); process.exit(1); }

  /* Wahrheitstabelle einlesen, falls vorhanden. */
  const pfadWahrheit = wahrheitDatei ?? path.join(ordner, 'wahrheit.csv');
  const wahrheit = new Map<string, Record<string, string>>();
  if (fs.existsSync(pfadWahrheit)) {
    const zeilen = fs.readFileSync(pfadWahrheit, 'utf8').trim().split(/\r?\n/);
    const kopf = zeilen[0].split(';').map((s) => s.trim().toLowerCase());
    for (const z of zeilen.slice(1)) {
      const teile = z.split(';');
      const satz: Record<string, string> = {};
      kopf.forEach((k, i) => { satz[k] = (teile[i] ?? '').trim(); });
      if (satz.datei) wahrheit.set(satz.datei, satz);
    }
    console.log(`Wahrheitstabelle: ${wahrheit.size} Zeilen\n`);
  } else {
    console.log('Keine wahrheit.csv gefunden — es wird nur gezeigt, was gelesen wurde.\n');
  }

  /* Erst pruefen, dann bezahlen. */
  const geprueft = await vorpruefen(ordner, alle);
  const raus = geprueft.filter((v) => v.grund);
  const ohneGeraet = geprueft.filter((v) => !v.grund && !v.geraet);
  const knapp = geprueft.filter((v) => !v.grund && v.kante < GUTEKANTE);

  if (raus.length) {
    console.log('-- Aussortiert, bevor es Geld kostet --');
    for (const v of raus) console.log(`  ${v.datei.padEnd(22)} ${v.grund}`);
    console.log();
  }
  if (knapp.length) {
    console.log(`Knapp: ${knapp.map((v) => `${v.datei} (${v.kante} px)`).join(', ')}`);
    console.log(`Unter ${GUTEKANTE} px lange Kante wird die Schrift im Schein grenzwertig.\n`);
  }
  if (ohneGeraet.length) {
    console.log('Kein Geraet im EXIF — aufgenommen wurde mit einer Kamera keines davon:');
    for (const v of ohneGeraet) console.log('  ' + v.datei);
    console.log('Dann misst dieser Lauf nicht das, was ein Haendler schickt.\n');
  }

  const fotos = (auchKleine ? geprueft : geprueft.filter((v) => !v.grund)).map((v) => v.datei);
  if (!fotos.length) {
    console.error('Nach der Vorpruefung bleibt kein brauchbares Bild uebrig.');
    console.error('Fahrzeugscheine mit dem Handy abfotografieren, nicht aus dem Netz nehmen.');
    process.exit(1);
  }
  if (!wahrheit.size) {
    console.log('Wahrheitstabelle leer — ohne abgelesene Sollwerte gibt es keine');
    console.log('Trefferquote, nur eine Liste dessen, was gelesen wurde.\n');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`ANTHROPIC_API_KEY fehlt — ${fotos.length} Bild(er) waeren zu lesen, es geht nicht los.`);
    process.exit(1);
  }
  console.log(`${fotos.length} von ${alle.length} Bildern werden geschickt.\n`);


  const treffer: Record<string, { richtig: number; falsch: number; leer: number }> = {};
  const abweichungen: string[] = [];

  for (const [i, datei] of fotos.entries()) {
    const roh = fs.readFileSync(path.join(ordner, datei));
    const typ = datei.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const anfrage = new Request('http://localhost/api/scan-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: `data:${typ};base64,${roh.toString('base64')}` }),
    });

    const start = Date.now();
    let antwort: Record<string, unknown> = {};
    try {
      const res = await POST(anfrage);
      antwort = await res.json();
      if (!res.ok) {
        console.log(`${String(i + 1).padStart(3)}/${fotos.length} ${datei}: FEHLER ${res.status} ${antwort.error ?? ''}`);
        continue;
      }
    } catch (err) {
      console.log(`${String(i + 1).padStart(3)}/${fotos.length} ${datei}: ABSTURZ ${String((err as Error)?.message).slice(0, 120)}`);
      continue;
    }

    const soll = wahrheit.get(datei);
    const zeile: string[] = [];
    for (const [feld, namen] of Object.entries(FELDER)) {
      const ist = wert(antwort, namen);
      if (!soll || !soll[feld]) {
        if (ist !== null) zeile.push(`${feld}=${ist}`);
        continue;
      }
      treffer[feld] ??= { richtig: 0, falsch: 0, leer: 0 };
      if (ist === null) {
        treffer[feld].leer++;
        abweichungen.push(`${datei}  ${feld}: nichts gelesen, erwartet "${soll[feld]}"`);
      } else if (gleich(ist, soll[feld])) {
        treffer[feld].richtig++;
      } else {
        treffer[feld].falsch++;
        abweichungen.push(`${datei}  ${feld}: gelesen "${ist}", erwartet "${soll[feld]}"`);
      }
    }
    console.log(`${String(i + 1).padStart(3)}/${fotos.length} ${datei.padEnd(24).slice(0, 24)} ${((Date.now() - start) / 1000).toFixed(1)} s  ${zeile.slice(0, 6).join('  ')}`);
  }

  if (Object.keys(treffer).length) {
    console.log('\n── Ergebnis je Feld ──');
    for (const [feld, t] of Object.entries(treffer)) {
      const gesamt = t.richtig + t.falsch + t.leer;
      const quote = gesamt ? Math.round((t.richtig / gesamt) * 100) : 0;
      console.log(`${feld.padEnd(16)} ${String(quote).padStart(3)} %   richtig ${t.richtig}, falsch ${t.falsch}, leer ${t.leer}`);
    }
  }
  if (abweichungen.length) {
    console.log('\n── Abweichungen ──');
    for (const a of abweichungen) console.log('  ' + a);
    console.log(`\n${abweichungen.length} Abweichungen. Jede einzelne waere im Inserat eine falsche Angabe.`);
  } else if (wahrheit.size) {
    console.log('\nKeine Abweichungen.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
