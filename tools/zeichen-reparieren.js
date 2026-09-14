/**
 * Repariert typische kaputte Umlaute gezielt, Zeichenfolge fuer Zeichenfolge.
 *
 *   node tools/zeichen-reparieren.js <datei>
 *
 * Bewusst KEINE Umkodierung der ganzen Datei. Der Versuch, eine Datei per
 * Latin-1-Umweg "zurueckzurechnen", hat einmal 136 Zeichen durch
 * Ersatzzeichen zerstoert, weil die Datei nur stellenweise kaputt war.
 */
const fs = require('fs');
const ERSATZ = [
  ['â”€', '─'], // ─ (Linienzeichen in Kommentar-Ueberschriften)
  ['â€”', '—'], // —
  ['â€“', '–'], // –
  ['â†’', '→'], // →
  ['â€ž', '„'], // „
  ['â€œ', '“'], // “
  ['Ã¤', 'ä'], ['Ã¶', 'ö'], ['Ã¼', 'ü'],
  ['ÃŸ', 'ß'], ['Ã„', 'Ä'], ['Ã–', 'Ö'],
  ['Ãœ', 'Ü'], ['Â·', '·'],
];
const p = process.argv[2];
let t = fs.readFileSync(p, 'utf8');
let summe = 0;
for (const [kaputt, heil] of ERSATZ) {
  const n = t.split(kaputt).length - 1;
  if (n) { t = t.split(kaputt).join(heil); summe += n; }
}
fs.writeFileSync(p, t, 'utf8');
console.log(p, 'repariert:', summe);
