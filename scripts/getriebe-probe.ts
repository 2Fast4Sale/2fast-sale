/**
 * Liest die Getriebeerkennung richtig — und schweigt sie, wenn unklar?
 *
 *   npx tsx scripts/getriebe-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Das Getriebe ist bei mobile.de Pflicht und steht nicht im Schein.
 * Jetzt wird es aus der Handelsbezeichnung gelesen — damit fällt eines
 * von vier Feldern weg, die der Händler sonst bei jedem Fahrzeug von
 * Hand setzen muss.
 *
 * Genau deshalb ist es gefährlich: "Automatik" im Inserat, wo ein
 * Schaltwagen steht, ist eine falsche Zusicherung an einen Käufer, der
 * deswegen anreist. Zwei Fehler liegen auf der Hand, und beide sind
 * hier aufgeschrieben:
 *
 *  • "Klimaautomatik" enthält das Wort "Automatik".
 *  • "quattro", "4MATIC" und "xDrive" stehen direkt neben dem
 *    Getriebenamen, sind aber Antrieb.
 *
 * Und der wichtigste Teil: Ohne Kürzel muss das Ergebnis LEER sein.
 * Ein Schaltwagen heißt einfach "2.0 TDI" — wer daraus "Manuell"
 * macht, rät. Lieber ein Feld, das der Händler ausfüllt, als eine
 * Angabe, die er nicht geprüft hat.
 */

import { getriebeAusText } from '../lib/getriebeAusText';

const FAELLE: { text: string; erwartet: 'Automatik' | null; was: string }[] = [
  /* ── Soll erkannt werden ──────────────────────────────────────── */
  { text: 'Volkswagen Golf VII 2.0 TDI DSG',          erwartet: 'Automatik', was: 'VW: DSG' },
  { text: 'Audi A4 Avant 2.0 TDI S tronic',           erwartet: 'Automatik', was: 'Audi: S tronic mit Leerzeichen' },
  { text: 'Audi A6 50 TDI S-tronic',                  erwartet: 'Automatik', was: 'Audi: S-tronic mit Bindestrich' },
  { text: 'BMW 320d Touring Steptronic',              erwartet: 'Automatik', was: 'BMW: Steptronic' },
  { text: 'Mercedes-Benz E 220 d 9G-TRONIC',          erwartet: 'Automatik', was: 'Mercedes: 9G-TRONIC' },
  { text: 'Porsche 911 Carrera PDK',                  erwartet: 'Automatik', was: 'Porsche: PDK' },
  { text: 'Ford Focus 1.5 EcoBoost Powershift',       erwartet: 'Automatik', was: 'Ford: Powershift' },
  { text: 'Nissan Qashqai 1.2 DIG-T XTRONIC',         erwartet: 'Automatik', was: 'Nissan: XTRONIC' },
  { text: 'Renault Megane 1.3 TCe EDC',               erwartet: 'Automatik', was: 'Renault: EDC' },
  { text: 'Toyota Corolla 1.8 Hybrid Automatik',      erwartet: 'Automatik', was: 'Wort "Automatik" im Klartext' },
  { text: 'Skoda Octavia 2.0 TDI 4x4 DSG',            erwartet: 'Automatik', was: 'Allrad UND Automatik: Automatik gewinnt' },
  { text: 'Audi Q5 45 TFSI quattro S tronic',         erwartet: 'Automatik', was: 'quattro daneben stoert nicht' },

  /* ── Darf NICHT erkannt werden ────────────────────────────────── */
  { text: 'Volkswagen Golf 1.6 TDI Klimaautomatik',   erwartet: null, was: 'FALLE: Klimaautomatik ist kein Getriebe' },
  { text: 'Opel Astra 1.4 Turbo mit Start-Stopp-Automatik', erwartet: null, was: 'FALLE: Start-Stopp-Automatik' },
  { text: 'Audi A3 2.0 TDI quattro',                  erwartet: null, was: 'FALLE: quattro ist Antrieb' },
  { text: 'Mercedes-Benz C 220 d 4MATIC',             erwartet: null, was: 'FALLE: 4MATIC ist Antrieb' },
  { text: 'BMW X3 xDrive20d',                         erwartet: null, was: 'FALLE: xDrive ist Antrieb' },
  { text: 'Volkswagen Tiguan 2.0 TDI 4motion',        erwartet: null, was: 'FALLE: 4motion ist Antrieb' },
  { text: 'Volkswagen Golf VII 2.0 TDI',              erwartet: null, was: 'Schaltwagen: Feld bleibt LEER, nicht "Manuell"' },
  { text: 'BMW 318i',                                 erwartet: null, was: 'Ohne Zusatz bleibt es leer' },
  { text: 'Opel Corsa 1.2 Easytronic',                erwartet: null, was: 'Halbautomatik bleibt Handarbeit' },
  { text: 'Fiat Panda 1.2 Dualogic',                  erwartet: null, was: 'Halbautomatik bleibt Handarbeit' },
  { text: '',                                         erwartet: null, was: 'Leerer Text' },
  { text: '   ',                                      erwartet: null, was: 'Nur Leerzeichen' },
];

let fehler = 0;
for (const fall of FAELLE) {
  const ist = getriebeAusText(fall.text);
  const ok = ist === fall.erwartet;
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!ok) {
    console.log(`       Text:     "${fall.text}"`);
    console.log(`       erwartet: ${fall.erwartet ?? 'leer'}`);
    console.log(`       bekommen: ${ist ?? 'leer'}`);
    fehler++;
  }
}

const erkannt = FAELLE.filter(f => f.erwartet === 'Automatik').length;
const leer = FAELLE.length - erkannt;
console.log(`\n${erkannt} Faelle sollen erkannt werden, ${leer} sollen leer bleiben.`);
console.log('Der zweite Teil ist der wichtigere: Ein falsches "Automatik" im');
console.log('Inserat laesst einen Kaeufer umsonst anreisen.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
