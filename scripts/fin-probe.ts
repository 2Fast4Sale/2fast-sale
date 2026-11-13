/**
 * Faengt die FIN-Pruefung die Fehler, die beim Ablesen entstehen?
 *
 *   npx tsx scripts/fin-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * Die FIN ist das Feld mit der hoechsten Folgekosten je Fehler: Ueber
 * sie bestellt der Kaeufer das Ersatzteil und prueft der Gutachter die
 * Historie. Eine FIN mit einem Dreher ist nicht ungenau, sie gehoert zu
 * einem anderen Auto oder zu keinem.
 */

import { finPruefen } from '../lib/finPruefen';

type Fall = { roh: string; fin: string | null; warum: string };

const FAELLE: Fall[] = [
  /* -- Muss durchgehen ---------------------------------------------- */
  { roh: 'WVWZZZ1KZAW123456', fin: 'WVWZZZ1KZAW123456', warum: 'saubere FIN' },
  { roh: 'wvwzzz1kzaw123456', fin: 'WVWZZZ1KZAW123456', warum: 'klein geschrieben' },
  { roh: 'WVWZZZ 1KZ AW123456', fin: 'WVWZZZ1KZAW123456', warum: 'mit Leerzeichen abgetippt' },
  { roh: 'VF320DT1201647035', fin: 'VF320DT1201647035', warum: 'echter Schein, Peugeot' },

  /* -- Muss berichtigt werden --------------------------------------- */
  { roh: 'WVWZZZ1KZAW12345O', fin: 'WVWZZZ1KZAW123450', warum: 'O am Ende ist eine Null' },
  { roh: 'WVWZZZ1KZAWI23456', fin: 'WVWZZZ1KZAW123456', warum: 'I ist eine Eins' },
  { roh: 'WVWZZZQKZAW123456', fin: 'WVWZZZ0KZAW123456', warum: 'Q gibt es in keiner FIN' },

  /* -- Muss verworfen werden ---------------------------------------- */
  { roh: 'WVWZZZ1KZAW12345', fin: null, warum: '16 Zeichen — welches fehlt, weiss niemand' },
  { roh: 'WVWZZZ1KZAW1234567', fin: null, warum: '18 Zeichen' },
  { roh: 'MUSTER12345678901', fin: 'MUSTER12345678901', warum: 'Musterschein — 17 Zeichen, faellt hier NICHT auf' },
  { roh: 'nicht lesbar', fin: null, warum: 'Freitext statt FIN' },
  { roh: '', fin: null, warum: 'leer' },
  { roh: 'WVW*ZZZ1KZAW12345', fin: null, warum: 'Sonderzeichen' },
];

let fehler = 0;
for (const f of FAELLE) {
  const e = finPruefen(f.roh);
  const ok = e.fin === f.fin;
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${JSON.stringify(f.roh).padEnd(22)} -> ${String(e.fin).padEnd(19)} (${f.warum})`);
  if (!ok) { console.log(`       erwartet: ${String(f.fin)}, Grund: ${e.grund}`); fehler++; }
  for (const b of e.berichtigt) console.log('        ' + b);
}

console.log('\nEine Grenze, die diese Pruefung NICHT hat: "MUSTER12345678901" aus');
console.log('einem Musterschein hat 17 gueltige Zeichen und geht durch. Ob die');
console.log('FIN zu einem echten Auto gehoert, sagt nur eine Datenbank.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
