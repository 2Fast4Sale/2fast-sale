/**
 * Prueft die Uebersetzung der Formularwerte in die Werte beider Portale.
 *
 *   npx tsx scripts/portal-felder.ts
 *
 * Warum es dieses Skript gibt: Der erste echte Uebertragungsversuch
 * scheiterte an "invalid-reference-data-value", weil eine einzige
 * Formularangabe keinen passenden Portalwert hatte — das Komma hinter
 * "VOLKSWAGEN," aus dem Fahrzeugschein. Die Antwort nannte kein Feld.
 *
 * Genau diese Fehlerklasse laesst sich ohne Zugangsdaten finden: Jede
 * Uebersetzungsfunktion gibt undefined zurueck, wenn sie einen Wert
 * nicht kennt. Hier laufen deshalb ALLE Werte durch, die das Formular
 * anbietet, und was undefined ergibt, steht am Ende als Liste da.
 *
 * AutoScout24 ist dabei der wichtigere Teil: Dort hat noch nie etwas
 * uebertragen, weil der Zugang fehlt. Ein Fehler, der dort schlaeft,
 * faellt sonst erst beim ersten echten Kunden auf.
 */

import {
  as24MarkenId, as24ModellId, as24KarosserieId, as24Kraftstoff, as24Getriebe,
  as24FarbeId, as24EuronormId, as24PolsterungId, as24InnenfarbeId, as24AntriebId, as24Hu,
} from '../lib/as24Uebersetzung';
import {
  mobileKategorie, mobileKraftstoff, mobileGetriebe, mobileFarbe, mobileEuronorm,
  mobileTueren, mobilePolsterung, mobileInnenfarbe, mobileAntrieb, mobileHu, laenderCode,
} from '../lib/mobileUebersetzung';
import { mobileMarkenWertOderNull, mobileModellWertOderNull } from '../lib/carDatabase';
import {
  KAROSSERIE, KRAFTSTOFFE, GETRIEBE, EURONORM, POLSTERUNG, INNENFARBE, ANTRIEB,
  LAENDERVERSION,
} from '../app/dashboard/listing/step1/useEntwurf';

/*
 * Die Auswahllisten kommen aus dem Formular selbst, nicht aus einer
 * Abschrift. Die erste Fassung dieses Skripts hatte sie abgetippt und
 * meldete prompt Luecken, die keine waren ("Velours" statt "Velour",
 * "Allradantrieb" statt "Allrad"). Eine Pruefung, die ihre eigene
 * Wahrheit mitbringt, prueft nichts.
 */
const LISTEN: Record<string, { werte: readonly string[]; mobile: (w: string) => unknown; as24: (w: string) => unknown }> = {
  Karosserieform: { werte: KAROSSERIE, mobile: mobileKategorie, as24: as24KarosserieId },
  Kraftstoff:     { werte: KRAFTSTOFFE, mobile: mobileKraftstoff, as24: as24Kraftstoff },
  Getriebe:       { werte: GETRIEBE, mobile: mobileGetriebe, as24: as24Getriebe },
  Schadstoffklasse: { werte: EURONORM, mobile: mobileEuronorm, as24: as24EuronormId },
  Polsterung:     { werte: POLSTERUNG, mobile: mobilePolsterung, as24: as24PolsterungId },
  Innenfarbe:     { werte: INNENFARBE, mobile: mobileInnenfarbe, as24: as24InnenfarbeId },
  Antrieb:        { werte: ANTRIEB, mobile: mobileAntrieb, as24: as24AntriebId },
  Laendervariante: { werte: LAENDERVERSION, mobile: laenderCode, as24: laenderCode },
  /*
   * Die Farbe ist KEINE Liste, sondern ein freies Feld mit dem
   * Platzhalter "Tiefschwarz". Der Haendler tippt also den Namen vom
   * Hersteller — und genau den muessen beide Portale auf eine ihrer
   * Grundfarben abbilden. Hier stehen deshalb die Schreibweisen, die
   * wirklich im Fahrzeugschein und im Verkaufsgespraech vorkommen.
   */
  "Farbe (freies Feld)": {
    werte: ['Schwarz', 'Tiefschwarz', 'Tiefschwarz Perleffekt', 'Weiss', 'Weiß', 'Reflexsilber',
            'Silber', 'Grau', 'Uranograu', 'Indiumgrau Metallic', 'Blau', 'Atlantikblau',
            'Rot', 'Tornadorot', 'Gruen', 'Grün', 'Beige', 'Braun', 'Gelb', 'Orange'],
    mobile: mobileFarbe, as24: as24FarbeId,
  },
  'HU (MM/JJJJ)': {
    werte: ['11/2026', '11.2026', '3/2027', '202611'],
    mobile: mobileHu, as24: as24Hu,
  },
};

/** Marken und Modelle, wie der Fahrzeugschein sie wirklich liefert. */
const FAHRZEUGE: Array<[string, string]> = [
  ['VOLKSWAGEN,', 'VW GOLF'],
  ['VOLKSWAGEN', 'Golf'],
  ['VW', 'Golf'],
  ['MERCEDES-BENZ,', 'C 200'],
  ['BMW,', '318'],
  ['AUDI,', 'A4'],
  ['SKODA,', 'Octavia'],
  ['OPEL,', 'Astra'],
  ['FORD,', 'Focus'],
  ['RENAULT,', 'Clio'],
];

const luecken: string[] = [];

console.log('── Auswahllisten ──────────────────────────────────────────────');
for (const [name, { werte, mobile, as24 }] of Object.entries(LISTEN)) {
  console.log(`\n${name}`);
  for (const wert of werte) {
    const m = mobile(wert);
    const a = as24(wert);
    const mText = m === undefined ? 'FEHLT' : JSON.stringify(m);
    const aText = a === undefined ? 'FEHLT' : JSON.stringify(a);
    console.log(`  ${wert.padEnd(20)} mobile.de ${String(mText).padEnd(22)} AutoScout24 ${aText}`);
    if (m === undefined) luecken.push(`${name} "${wert}" → mobile.de kennt keinen Wert`);
    if (a === undefined) luecken.push(`${name} "${wert}" → AutoScout24 kennt keinen Wert`);
  }
}

console.log('\n── Marke und Modell aus dem Fahrzeugschein ────────────────────');
for (const [marke, modell] of FAHRZEUGE) {
  const mM = mobileMarkenWertOderNull(marke);
  const mMo = mobileModellWertOderNull(marke, modell);
  const aM = as24MarkenId(marke);
  const aMo = as24ModellId(marke, modell);
  console.log(`  ${(marke + ' ' + modell).padEnd(26)} mobile.de ${String(mM)}/${String(mMo)}`
    + `   AutoScout24 ${String(aM)}/${String(aMo)}`);
  if (!mM) luecken.push(`Marke "${marke}" → mobile.de kennt sie nicht`);
  if (!mMo) luecken.push(`Modell "${modell}" (${marke}) → mobile.de kennt es nicht`);
  if (aM === undefined) luecken.push(`Marke "${marke}" → AutoScout24 kennt sie nicht`);
  if (aMo === undefined) luecken.push(`Modell "${modell}" (${marke}) → AutoScout24 kennt es nicht`);
}

console.log('\n── Laendercode ───────────────────────────────────────────────');
for (const land of ['Deutschland', 'Österreich', 'Schweiz', 'EU-Fahrzeug']) {
  const c = laenderCode(land);
  console.log(`  ${land.padEnd(20)} ${c ?? 'FEHLT'}`);
  if (!c) luecken.push(`Land "${land}" → kein Code`);
}

console.log('\n── Tueren ────────────────────────────────────────────────────');
for (const n of [2, 3, 4, 5, 6, 7]) {
  const t = mobileTueren(n);
  console.log(`  ${String(n).padEnd(20)} mobile.de ${t ?? 'FEHLT'}`);
  if (!t) luecken.push(`Tueren ${n} → mobile.de kennt keinen Wert`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (luecken.length === 0) {
  console.log('Keine Luecken. Jeder Wert aus dem Formular hat bei beiden Portalen eine Entsprechung.');
} else {
  console.log(`${luecken.length} Luecken:\n`);
  for (const l of luecken) console.log('  • ' + l);
}
