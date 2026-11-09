/**
 * Haelt die Nachkontrolle der Nahaufnahmen-Erkennung?
 *
 *   npx tsx scripts/nahaufnahme-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf, kein Foto.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Die Erkennung aus Nahaufnahmen darf mehr Merkmale finden als die aus
 * dem Inseratsstapel: Klimaautomatik, Tempomat, Einparkhilfe. Das ist
 * nur zu verantworten, weil sie an eine Stelle gebunden sind, an der
 * sie ablesbar sind — und weil jedes Merkmal einen Beleg braucht.
 *
 * Dieser groessere Katalog ist aber auch das Risiko. Faellt die
 * Nachkontrolle aus, stehen Merkmale im Inserat, die niemand gesehen
 * hat, und der Haendler haftet dafuer. Die Anweisung an das Modell
 * verbietet Raten, aber eine Anweisung ist keine Garantie.
 *
 * Geprueft wird deshalb vor allem, was NICHT durchkommen darf. Jeder
 * Fall hier ist eine Antwort, wie ein Modell sie wirklich liefern kann.
 */

import { belegePruefen, codesPruefen, STELLEN, STELLEN_REIHE } from '../lib/ausstattungStellen';

type Fall = {
  was: string;
  fotografiert: string[];
  antwort: unknown;
  erwartet: string[];
};

const FAELLE: Fall[] = [
  {
    was: 'Belegtes Merkmal an der richtigen Stelle kommt durch',
    fotografiert: ['mittelkonsole'],
    antwort: [{ merkmal: 'Sitzheizung vorn', stelle: 'mittelkonsole',
                beleg: 'Taste mit Sitzsymbol und drei Wellenlinien' }],
    erwartet: ['Sitzheizung vorn'],
  },
  {
    was: 'Floskel statt Beleg faellt heraus — der wichtigste Fall',
    fotografiert: ['mittelkonsole'],
    antwort: [{ merkmal: 'Standheizung', stelle: 'mittelkonsole',
                beleg: 'bei diesem Modell üblich vorhanden' }],
    erwartet: [],
  },
  {
    was: '"wahrscheinlich" ist kein Beleg',
    fotografiert: ['lenkrad'],
    antwort: [{ merkmal: 'Abstandsregeltempomat', stelle: 'lenkrad',
                beleg: 'wahrscheinlich vorhanden, Hebel sichtbar' }],
    erwartet: [],
  },
  {
    was: 'Beleg, der nur das Merkmal wiederholt, ist zu duenn',
    fotografiert: ['klimabedienteil'],
    antwort: [{ merkmal: 'Klimaautomatik', stelle: 'klimabedienteil', beleg: 'AUTO' }],
    erwartet: [],
  },
  {
    was: 'Richtige Stelle, aber nicht fotografiert: nichts kommt durch',
    fotografiert: ['lenkrad'],
    antwort: [{ merkmal: 'Klimaautomatik', stelle: 'klimabedienteil',
                beleg: 'Taste AUTO und zwei getrennte Temperaturanzeigen' }],
    erwartet: [],
  },
  {
    was: 'Merkmal gehoert nicht zum Katalog DIESER Stelle',
    fotografiert: ['lenkrad'],
    antwort: [{ merkmal: 'Klimaautomatik', stelle: 'lenkrad',
                beleg: 'Taste AUTO am Lenkradkranz zu sehen' }],
    erwartet: [],
  },
  {
    was: 'Erfundenes Merkmal, das in keinem Katalog steht',
    fotografiert: ['mittelkonsole'],
    antwort: [{ merkmal: 'Nachtsichtassistent', stelle: 'mittelkonsole',
                beleg: 'Taste mit Nachtsichtsymbol klar lesbar' }],
    erwartet: [],
  },
  {
    was: 'Dasselbe Merkmal an zwei Stellen zaehlt einmal',
    fotografiert: ['mittelkonsole', 'klimabedienteil'],
    antwort: [
      { merkmal: 'Sitzheizung vorn', stelle: 'mittelkonsole',
        beleg: 'Taste mit Sitzsymbol und Wellenlinien' },
      { merkmal: 'Sitzheizung vorn', stelle: 'klimabedienteil',
        beleg: 'Symbol links neben dem Temperaturregler' },
    ],
    erwartet: ['Sitzheizung vorn'],
  },
  {
    was: 'Mehrere belegte Merkmale aus mehreren Stellen',
    fotografiert: ['klimabedienteil', 'bildschirm'],
    antwort: [
      { merkmal: '2-Zonen-Klimaautomatik', stelle: 'klimabedienteil',
        beleg: 'zwei getrennte Temperaturanzeigen, Taste AUTO' },
      { merkmal: 'Navigationssystem', stelle: 'bildschirm',
        beleg: 'Kartenansicht mit Strassennamen auf dem Display' },
    ],
    erwartet: ['2-Zonen-Klimaautomatik', 'Navigationssystem'],
  },
  {
    was: 'Fehlender Beleg, fehlende Stelle, kaputte Antwort',
    fotografiert: ['mittelkonsole'],
    antwort: [
      { merkmal: 'Einparkhilfe' },
      { stelle: 'mittelkonsole', beleg: 'Taste PDC deutlich beschriftet' },
      'Sitzheizung vorn',
      null,
    ],
    erwartet: [],
  },
  {
    was: 'Keine Antwort ist auch eine Antwort',
    fotografiert: ['mittelkonsole'],
    antwort: null,
    erwartet: [],
  },
];

let fehler = 0;

console.log('── Belege ──────────────────────────────────────────────');
for (const fall of FAELLE) {
  const ist = belegePruefen(fall.antwort, fall.fotografiert).map(b => b.merkmal);
  const gleich = ist.length === fall.erwartet.length
    && ist.every((m, i) => m === fall.erwartet[i]);
  console.log(`${gleich ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!gleich) {
    console.log(`       erwartet: ${JSON.stringify(fall.erwartet)}`);
    console.log(`       bekommen: ${JSON.stringify(ist)}`);
    fehler++;
  }
}

console.log('\n── Werkscodes ──────────────────────────────────────────');
const CODE_FAELLE: { was: string; roh: unknown; erwartet: string[] }[] = [
  { was: 'Echte PR-Nummern kommen durch',
    roh: ['4A3', '7X2', 'PR-9VD'], erwartet: ['4A3', '7X2', 'PR-9VD'] },
  { was: 'Kleinschreibung wird vereinheitlicht',
    roh: ['4a3', '4A3'], erwartet: ['4A3'] },
  { was: 'Ein ganzer Satz ist kein Code',
    roh: ['Sitzheizung vorne und hinten verbaut'], erwartet: [] },
  { was: 'Nichts Unsinniges, aber auch kein Absturz',
    roh: [null, 42, '', '   ', 'OK'], erwartet: ['OK'] },
];
for (const fall of CODE_FAELLE) {
  const ist = codesPruefen(fall.roh);
  const gleich = ist.length === fall.erwartet.length
    && ist.every((c, i) => c === fall.erwartet[i]);
  console.log(`${gleich ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!gleich) {
    console.log(`       erwartet: ${JSON.stringify(fall.erwartet)}`);
    console.log(`       bekommen: ${JSON.stringify(ist)}`);
    fehler++;
  }
}

console.log('\n── Katalog ─────────────────────────────────────────────');
/* Jede Stelle in der Reihenfolge muss es auch wirklich geben, sonst
   zeigt die Oberflaeche eine Stelle, deren Merkmale der Server
   verwirft. */
for (const schluessel of STELLEN_REIHE) {
  const da = Boolean(STELLEN[schluessel]);
  console.log(`${da ? 'OK   ' : 'FEHLER'} ${schluessel}`);
  if (!da) fehler++;
}
const anzahl = Object.values(STELLEN).reduce((s, v) => s + v.merkmale.length, 0);
console.log(`       ${Object.keys(STELLEN).length} Stellen, ${anzahl} Merkmale insgesamt`);

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
