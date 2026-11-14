/**
 * Entscheidet die Anhaengelast richtig zwischen Feld und Bemerkung?
 *
 *   npx tsx scripts/anhaengelast-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt --------------------------------------
 *
 * Gefunden an einem echten Schein (Golf VII, 01.11.2016): Feld O.1
 * sagt 1500 kg, die Bemerkungen sagen "B.ANHAENGEBETRIEB*O.1:1800".
 * Derselbe Schein, zwei Zahlen. Der Scan las die Bemerkung, ein Mensch
 * das Feld -- beide hatten recht.
 *
 * Welcher Wert gilt, haengt davon ab, ob die Bedingung der Bemerkung am
 * konkreten Fahrzeug erfuellt ist (werkseitige AHK, Steigung). Das
 * steht in keinem Feld. Also entscheidet der Haendler, und die Software
 * laesst das Feld leer.
 *
 * Eine Anhaengelast zu hoch im Inserat ist kein Schoenheitsfehler: Wer
 * danach einen Anhaenger kauft und ueberladen faehrt, haftet -- und
 * die Angabe kam vom Haendler.
 */

import { anhaengelastEntscheiden, anhaengelastAusBemerkung } from '../lib/anhaengelast';

type Fall = { was: string; feld: unknown; bem: unknown; wert: number | null; meldung: boolean };

const FAELLE: Fall[] = [
  { was: 'Der echte Fall: O.1 sagt 1500, Bemerkung sagt 1800',
    feld: 1500, bem: 1800, wert: null, meldung: true },
  { was: 'Beide einig — Wert wird uebernommen',
    feld: 1800, bem: 1800, wert: 1800, meldung: false },
  { was: 'Nur das Feld — der Normalfall',
    feld: 1500, bem: null, wert: 1500, meldung: false },
  { was: 'Nur eine Bemerkung — kein Widerspruch, sondern die einzige Angabe',
    feld: null, bem: 1800, wert: 1800, meldung: false },
  { was: 'Gar nichts gelesen',
    feld: null, bem: null, wert: null, meldung: false },
  { was: 'Leerer Text zaehlt wie nichts',
    feld: '', bem: '', wert: null, meldung: false },
  { was: 'Zahl als Text ist dieselbe Zahl',
    feld: '1800', bem: 1800, wert: 1800, meldung: false },
  { was: 'Null kg ist keine Angabe',
    feld: 0, bem: null, wert: null, meldung: false },
  { was: 'Unsinn im Feld wird nicht uebernommen',
    feld: 'keine', bem: null, wert: null, meldung: false },
  { was: 'Bemerkung NIEDRIGER als das Feld ist genauso ein Widerspruch',
    feld: 1800, bem: 1500, wert: null, meldung: true },
];

let fehler = 0;
for (const f of FAELLE) {
  const e = anhaengelastEntscheiden(f.feld, f.bem, 'Anhängelast gebremst');
  const ok = e.wert === f.wert && Boolean(e.widerspruch) === f.meldung;
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${f.was}`);
  console.log(`       Feld ${JSON.stringify(f.feld)}, Bemerkung ${JSON.stringify(f.bem)}`
    + ` -> ${JSON.stringify(e.wert)}${e.widerspruch ? '  (' + e.widerspruch + ')' : ''}`);
  if (!ok) { console.log(`       erwartet: ${JSON.stringify(f.wert)}, Meldung ${f.meldung}`); fehler++; }
}


/* -- Die Suche im Bemerkungstext ---------------------------------- */

type Suchfall = { was: string; text: string; gebremst: number | null; ungebremst: number | null };

const SUCHE: Suchfall[] = [
  { was: 'Der echte Schein, Golf VII', gebremst: 1800, ungebremst: null,
    text: 'E.1/E.2:+50 U. 7.2/8.2:+65 B.ANHÄNGEBETRIEB*O.1:1800 B' },
  { was: 'Die anderen Zahlen desselben Scheins zaehlen NICHT', gebremst: null, ungebremst: null,
    text: 'TECHN.ZUL.GES-MASSE D.ZUGKOMBINATION:3370 BIS 8% STEIG.:3670' },
  { was: 'Beide Lasten in den Bemerkungen', gebremst: 1800, ungebremst: 750,
    text: 'ANHAENGEBETRIEB O.1:1800 O.2:750' },
  { was: 'Fuehrende Nullen wie im Schein', gebremst: 1500, ungebremst: 660,
    text: 'O.1:01500 O.2:0660' },
  { was: 'Mit Leerzeichen und Gleichheitszeichen', gebremst: 1700, ungebremst: null,
    text: 'B. ANHAENGEBETRIEB * O . 1 = 1700' },
  { was: 'Kein Bemerkungstext', gebremst: null, ungebremst: null, text: '' },
  { was: 'Bemerkungen ohne Anhaengelast', gebremst: null, ungebremst: null,
    text: 'GEM.3.AEND.VO.Z.9.AUSN.VO.Z.STVO*STUFE PM 5 AB TAG E.ERSTZUL.' },
  { was: 'O.1 ohne Zahl dahinter', gebremst: null, ungebremst: null,
    text: 'SIEHE O.1 UND O.2 IM FELD' },
];

for (const f of SUCHE) {
  const e = anhaengelastAusBemerkung(f.text);
  const ok = e.gebremst === f.gebremst && e.ungebremst === f.ungebremst;
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${f.was}`);
  console.log(`       "${f.text.slice(0, 62)}" -> O.1 ${e.gebremst}, O.2 ${e.ungebremst}`);
  if (!ok) { console.log(`       erwartet: O.1 ${f.gebremst}, O.2 ${f.ungebremst}`); fehler++; }
}

console.log('');
console.log('Die Suche steht im Code und nicht im Prompt, weil die Anweisung');
console.log('"schreib den Wert ins andere Feld" in drei Laeufen zweimal');
console.log('missachtet wurde. Eine Sicherung, die manchmal greift, ist keine.');
console.log('\nEntschieden hat das nicht die Software und nicht ich, sondern Fabian:');
console.log('Er ist KFZ-Mechatroniker, er sieht das Fahrzeug, und er haftet fuer');
console.log('die Angabe. Die Software stellt nur sicher, dass sie ihn fragt.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
