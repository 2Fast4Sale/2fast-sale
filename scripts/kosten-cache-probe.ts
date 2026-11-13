/**
 * Rechnet die Kostenbuchung den Prompt-Zwischenspeicher richtig?
 *
 *   npx tsx scripts/kosten-cache-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * -- Warum es diese Probe gibt -------------------------------------
 *
 * input_tokens in der Antwort von Anthropic enthaelt die
 * zwischengespeicherten Tokens NICHT. Sie stehen getrennt in
 * cache_creation_input_tokens und cache_read_input_tokens.
 *
 * Wer das uebersieht, schaltet den Speicher ein und sieht in der
 * eigenen Tabelle halbierte Kosten — ohne dass irgendwo ein Fehler
 * auftaucht. Das ist dieselbe Art von stillem Fehler wie das
 * durchgereichte Bildformat: alles sieht gut aus, die Zahl ist falsch.
 *
 * Geprueft wird deshalb die Richtung: Ein Lauf MIT Speicher darf nicht
 * billiger gebucht werden, als er tatsaechlich ist.
 */

import { llmCostMicros } from '../lib/apiCosts';

const MODELL = 'claude-opus-4-8';

/* Ein Schein: rund 2.800 Tokens fester Prompt, 2.700 Tokens Bild. */
const FEST = 2800;
const BILD = 2700;
const AUS = 600;

type Fall = { was: string; ist: number; soll: (n: number) => boolean; zeig: string };

const ohne = llmCostMicros(MODELL, FEST + BILD, AUS);
const ersterMitSpeicher = llmCostMicros(MODELL, BILD, AUS, FEST, 0);
const weitereMitSpeicher = llmCostMicros(MODELL, BILD, AUS, 0, FEST);
/* Was passieren WUERDE, wenn man die Speicher-Tokens vergisst. */
const vergessen = llmCostMicros(MODELL, BILD, AUS);

const FAELLE: Fall[] = [
  {
    was: 'Der erste Aufruf ist teurer als ohne Speicher',
    ist: ersterMitSpeicher,
    soll: (n) => n > ohne,
    zeig: `${ersterMitSpeicher} > ${ohne}`,
  },
  {
    was: 'Jeder weitere Aufruf ist billiger als ohne Speicher',
    ist: weitereMitSpeicher,
    soll: (n) => n < ohne,
    zeig: `${weitereMitSpeicher} < ${ohne}`,
  },
  {
    was: 'Speicher-Tokens zu vergessen bucht zu wenig',
    ist: vergessen,
    soll: (n) => n < weitereMitSpeicher,
    zeig: `${vergessen} < ${weitereMitSpeicher} — genau der stille Fehler`,
  },
  {
    was: 'Ohne Speicher-Tokens rechnet es wie vorher',
    ist: llmCostMicros(MODELL, FEST + BILD, AUS, 0, 0),
    soll: (n) => n === ohne,
    zeig: `${ohne}`,
  },
];

let fehler = 0;
for (const f of FAELLE) {
  const ok = f.soll(f.ist);
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${f.was}`);
  console.log(`       ${f.zeig}`);
  if (!ok) fehler++;
}

/* Was ein Lauf mit zehn Scheinen hintereinander kostet. */
const zehnOhne = ohne * 10;
const zehnMit = ersterMitSpeicher + weitereMitSpeicher * 9;
const eur = (mikro: number) => (mikro / 1_000_000).toFixed(2).replace('.', ',') + ' EUR';
console.log(`\nZehn Scheine ohne Speicher: ${eur(zehnOhne)}`);
console.log(`Zehn Scheine mit Speicher:  ${eur(zehnMit)}`);
console.log(`Ersparnis: ${Math.round((1 - zehnMit / zehnOhne) * 100)} %`);
console.log('(Brutto in Euro, so wie es in der Tabelle gebucht wird.)');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
