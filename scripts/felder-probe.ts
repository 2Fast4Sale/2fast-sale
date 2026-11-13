/**
 * Wie viel muss der Händler wirklich noch selbst eintragen?
 *
 *   npx tsx scripts/felder-probe.ts
 *
 * KOSTET NICHTS — vergleicht nur Listen, kein Modellaufruf.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * "Die KI soll alles selbst richtig ausfüllen, damit der Händler nichts
 * machen muss" ist als Ziel nicht erreichbar — der Kilometerstand steht
 * im Tacho, der Preis im Kopf des Händlers. Ein unerreichbares Ziel ist
 * schlimmer als ein hohes: Man wird nie fertig.
 *
 * Diese Probe ersetzt das Ziel durch eine Zahl. Sie prüft drei Dinge:
 *
 *  1. Dass die Tabelle in lib/felderHerkunft.ts zu dem passt, was der
 *     Schein-Scan wirklich ausgibt. Behauptet die Tabelle ein Feld käme
 *     vom Schein, obwohl der Scan es nie liefert, bleibt es im Formular
 *     leer — und niemand merkt, warum.
 *  2. Dass jedes Pflichtfeld von mobile.de in der Tabelle steht. Ein
 *     fehlendes Pflichtfeld heisst: Das Inserat sieht fertig aus und
 *     wird beim Übertragen zurückgewiesen.
 *  3. Wie viele Felder am Ende Handarbeit bleiben — und bei jedem,
 *     warum es nicht anders geht.
 */

import fs from 'node:fs';
import path from 'node:path';
import { FELDER, handarbeit, handarbeitPflicht } from '../lib/felderHerkunft';

const WURZEL = path.resolve(__dirname, '..');
let fehler = 0;

/* ── 1. Liefert der Scan, was die Tabelle behauptet? ───────────── */
console.log('── Schein-Scan gegen Tabelle ───────────────────────────');

const scanQuelle = fs.readFileSync(path.join(WURZEL, 'app/api/scan-doc/route.ts'), 'utf8');
/* Die Felder aus dem Antwortschema im Prompt. */
const schema = scanQuelle.match(/\{\s*\n\s*"brand"[\s\S]*?\n\}/)?.[0] ?? '';
const ausScan = new Set([...schema.matchAll(/"([a-zA-Z]+)":/g)].map(m => m[1]));

/*
 * Drei Felder stehen mit Absicht nicht im Schema, kommen aber dennoch
 * vom Schein — sie werden aus einem anderen Feld gewonnen. Das ist in
 * Ordnung, muss aber benannt sein, sonst sieht es wie eine Lücke aus.
 */
const UEBER_UMWEG: Record<string, string> = {
  model:      'steckt in "brand" und wird von splitBrandModel getrennt',
  metallic:   'steckt im Farbtext ("Silber Metallic")',
  leistungPs: 'aus powerKw umgerechnet',
  bodyType:   'aus "aufbau" (Feld 4) uebersetzt',
  envkv:      'aus Kraftstoff, Hubraum und Leistung gerechnet',
  gearbox:    'aus der Handelsbezeichnung gelesen (getriebeAusText), sonst leer',
};

for (const f of FELDER) {
  if (f.herkunft !== 'schein' && f.herkunft !== 'abgeleitet') continue;
  if (ausScan.has(f.schluessel)) {
    console.log(`OK    ${f.name.padEnd(20)} direkt im Scan`);
  } else if (UEBER_UMWEG[f.schluessel]) {
    console.log(`OK    ${f.name.padEnd(20)} ${UEBER_UMWEG[f.schluessel]}`);
  } else {
    console.log(`FEHLER ${f.name.padEnd(20)} behauptet "${f.herkunft}", aber der Scan gibt es nicht aus`);
    fehler++;
  }
}

/* ── 2. Ist jedes Pflichtfeld erfasst? ─────────────────────────── */
console.log('\n── Pflichtfelder des Formulars ─────────────────────────');

const entwurf = fs.readFileSync(path.join(WURZEL, 'app/dashboard/listing/step1/useEntwurf.ts'), 'utf8');
const pflichtZeile = entwurf.match(/const PFLICHT = \[([^\]]*)\]/)?.[1] ?? '';
const pflichtIst = [...pflichtZeile.matchAll(/'([a-zA-Z]+)'/g)].map(m => m[1]);

for (const schluessel of pflichtIst) {
  const f = FELDER.find(x => x.schluessel === schluessel);
  if (!f) {
    console.log(`FEHLER ${schluessel} ist Pflicht, steht aber in keiner Herkunftstabelle`);
    fehler++;
  } else if (!f.pflicht) {
    console.log(`FEHLER ${f.name} ist im Formular Pflicht, in der Tabelle aber nicht`);
    fehler++;
  } else {
    console.log(`OK    ${f.name.padEnd(20)} Pflicht, Herkunft: ${f.herkunft}`);
  }
}
/* Und umgekehrt: nichts als Pflicht markieren, was keine ist. */
for (const f of FELDER.filter(x => x.pflicht)) {
  if (!pflichtIst.includes(f.schluessel)) {
    console.log(`FEHLER ${f.name} steht in der Tabelle als Pflicht, im Formular nicht`);
    fehler++;
  }
}

/* ── 3. Was bleibt Handarbeit? ─────────────────────────────────── */
console.log('\n── Was der Haendler selbst eintragen muss ──────────────');

const rest = handarbeit();
const restPflicht = handarbeitPflicht();

for (const f of rest) {
  console.log(`  ${f.pflicht ? 'PFLICHT' : 'freiwil'} ${f.name}`);
  console.log(`          ${f.warum}`);
  if (!f.warum) { console.log('FEHLER   ohne Begruendung — dann ist es keine Handarbeit, sondern eine Luecke'); fehler++; }
}

const automatisch = FELDER.length - rest.length;
console.log(`\n  ${FELDER.length} Felder insgesamt`);
console.log(`  ${automatisch} kommen automatisch (${Math.round((automatisch / FELDER.length) * 100)} %)`);
console.log(`  ${rest.length} bleiben Handarbeit, davon ${restPflicht.length} Pflicht`);
console.log(`\n  Das Minimum fuer ein uebertragbares Inserat: ${restPflicht.map(f => f.name).join(', ')}.`);
console.log(`  Weniger als diese ${restPflicht.length} geht physisch nicht. Wer null anstrebt,`);
console.log('  wird nie fertig.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
