/**
 * Faengt die Zusammenfuehrung doppelte Merkmale ab?
 *
 *   npx tsx scripts/ausstattung-doppelt-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * Anlass: Im ersten echten Lauf standen "Anhängerkupplung" und
 * "Anhängerkupplung, abnehmbar" nebeneinander in der Liste. Fuer ein
 * Portal ist das ein Merkmal, und doppelt gemeldet je nach Portal ein
 * Fehler.
 *
 * Geprueft wird beides: dass Doppeltes verschwindet UND dass
 * Verschiedenes stehen bleibt. Der zweite Teil ist der wichtigere —
 * eine Zusammenfuehrung, die zu viel schluckt, nimmt dem Haendler
 * Merkmale weg, die er verkauft hat.
 */

import { ausstattungZusammenfuehren } from '../lib/equipmentDatabase';

type Fall = {
  was: string;
  bestehend: string[];
  neu: string[];
  erwartet: string[];
};

const FAELLE: Fall[] = [
  {
    was: 'Der gemeldete Fall: Kupplung einmal allgemein, einmal genau',
    bestehend: ['Anhängerkupplung'],
    neu: ['Sitzheizung vorn', 'Anhängerkupplung, abnehmbar'],
    erwartet: ['Anhängerkupplung, abnehmbar', 'Sitzheizung vorn'],
  },
  {
    was: 'Dieselbe Angabe zweimal, nur andere Schreibweise',
    bestehend: ['Sitzheizung'],
    neu: ['sitzheizung'],
    erwartet: ['Sitzheizung'],
  },
  {
    was: 'Vorbereitet bleibt vorbereitet — der vorsichtigere Eintrag gewinnt',
    bestehend: ['Navigationssystem'],
    neu: ['Navigationssystem vorbereitet'],
    erwartet: ['Navigationssystem vorbereitet'],
  },
  {
    was: 'Vorne und hinten sind ZWEI Merkmale, nicht eines',
    bestehend: ['Einparkhilfe vorne'],
    neu: ['Einparkhilfe hinten'],
    erwartet: ['Einparkhilfe vorne', 'Einparkhilfe hinten'],
  },
  {
    was: 'Keine Wortgrenze, also kein Zusammenlegen',
    bestehend: ['Sitzheizung'],
    neu: ['Sitzheizungsschalter defekt'],
    erwartet: ['Sitzheizung', 'Sitzheizungsschalter defekt'],
  },
  {
    was: 'Leere und blosse Leerzeichen fallen weg',
    bestehend: ['Alufelgen', '  '],
    neu: ['', 'Dachreling'],
    erwartet: ['Alufelgen', 'Dachreling'],
  },
  {
    was: 'Nichts Neues — die bestehende Liste bleibt, wie sie ist',
    bestehend: ['Ledersitze', 'Panoramadach'],
    neu: [],
    erwartet: ['Ledersitze', 'Panoramadach'],
  },
];

let fehler = 0;
for (const fall of FAELLE) {
  const ist = ausstattungZusammenfuehren(fall.bestehend, fall.neu);
  const gleich = ist.length === fall.erwartet.length
    && ist.every((e, i) => e === fall.erwartet[i]);
  console.log(`${gleich ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!gleich) {
    console.log(`       erwartet: ${JSON.stringify(fall.erwartet)}`);
    console.log(`       bekommen: ${JSON.stringify(ist)}`);
    fehler++;
  }
}

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} von ${FAELLE.length}.`);
process.exitCode = fehler === 0 ? 0 : 1;
