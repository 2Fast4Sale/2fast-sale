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
import { POST } from '../app/api/scan-doc/route';

const [ordner, wahrheitDatei] = process.argv.slice(2);
if (!ordner) {
  console.error('Aufruf: schein-test.ts <ordner> [wahrheit.csv]');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt — ohne Schluessel kann nichts gelesen werden.');
  process.exit(1);
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
  const fotos = fs.readdirSync(ordner)
    .filter((f) => /\.(jpe?g|png|webp|avif|heic)$/i.test(f))
    .sort();
  if (!fotos.length) { console.error('Keine Fotos in', ordner); process.exit(1); }

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
