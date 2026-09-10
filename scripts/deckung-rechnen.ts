/**
 * Ab wann traegt sich 2Fast4Sale?
 *
 *   npx tsx scripts/deckung-rechnen.ts
 *
 * Rechnet fuer jedes Paket durch, was ein Inserat einbringt, was es
 * kostet und ab welcher Menge die festen Kosten gedeckt sind.
 */

import { PAKETE, PREIS_PRO_INSERAT_CENT, GRUNDGEBUEHR_CENT, euro } from '../lib/preismodell';
import { studioInklusive } from '../lib/studioQuota';
import { deckung, FESTKOSTEN, bildpreisEffektiv } from '../lib/kostenmodell';

const faelle = [
  { name: 'ohne Paket', erloes: PREIS_PRO_INSERAT_CENT, paket: null as null | 's' | 'm' | 'l', menge: 20 },
  ...PAKETE.map((p) => ({
    name: p.name,
    erloes: Math.round(p.preisCent / p.inserate),
    paket: p.id,
    menge: p.inserate,
  })),
];

console.log('\nFESTE KOSTEN IM MONAT');
console.log('-'.repeat(72));
for (const p of FESTKOSTEN) {
  const marke = p.quelle === 'offen' ? '  OFFEN' : p.quelle === 'gemessen' ? 'gemessen' : '  Liste';
  console.log(`${p.name.padEnd(38)} ${euro(p.cent).padStart(9)} EUR  ${marke}`);
}
console.log('-'.repeat(72));

console.log('\nJE PAKET');
console.log('-'.repeat(78));
console.log('Paket        Inserate  Erloes/Ins  Bilder  Kosten/Ins  Deckungsbeitrag  Schwelle');
console.log('-'.repeat(78));

for (const f of faelle) {
  const bilder = studioInklusive(f.paket);
  const d = deckung({
    erloesJeInseratCent: f.erloes,
    studioBilderJeInserat: bilder,
    inserateImMonat: f.menge,
  });
  console.log(
    f.name.padEnd(12),
    String(f.menge).padStart(8),
    euro(f.erloes).padStart(11),
    String(bilder).padStart(7),
    euro(d.variabelCent).padStart(11),
    euro(d.deckungsbeitragCent).padStart(16),
    (d.schwelle === Infinity ? 'nie' : `${d.schwelle} Inserate`).padStart(14),
  );
}
console.log('-'.repeat(78));

const beispiel = deckung({ erloesJeInseratCent: PREIS_PRO_INSERAT_CENT, studioBilderJeInserat: 8, inserateImMonat: 20 });
console.log(`\nOhne Paket kommt die Grundgebuehr von ${euro(GRUNDGEBUEHR_CENT)} EUR je Haendler und Monat obendrauf.`);
console.log(`\nACHTUNG: ${beispiel.offenePosten} Posten haben noch keinen Preis (Steuerberater, IT-Kanzlei,`);
console.log('Haftpflicht, mobile.de, AutoScout24). Die Schwelle oben ist deshalb eine');
console.log('UNTERGRENZE — sie steigt, sobald diese Zahlen feststehen.\n');

console.log('Was ein Bild je nach Monatsmenge wirklich kostet (PhotoRoom-Abo, 100 EUR / 1000 Bilder):');
for (const n of [120, 360, 600, 1000, 2000]) {
  console.log(`  ${String(n).padStart(5)} Bilder im Monat  →  ${euro(Math.round(bildpreisEffektiv(n)))} EUR je Bild`);
}
console.log();
