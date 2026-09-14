/**
 * Findet kaputte Umlaute in Quelldateien.
 *
 *   node tools/zeichen-pruefen.js <datei> [<datei> ...]
 *
 * Wenn PowerShell eine UTF-8-Datei als ANSI liest und zurueckschreibt,
 * wird aus "—" ein "â€”" und aus "ü" ein "Ã¼". Das faellt beim Lesen
 * des Codes kaum auf, steht dann aber in Fehlermeldungen, die Haendler
 * zu sehen bekommen.
 */
const fs = require('fs');
const KAPUTT = /â€|â”|â†|Ã[¤¶¼Ÿ„–œ]/g;
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const k = (t.match(KAPUTT) || []).length;
  const e = (t.match(/�/g) || []).length;
  console.log(p.padEnd(44), 'kaputt', k, 'Ersatzzeichen', e);
}
